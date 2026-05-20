# Rate Limiting 전략

### Background / Context

`/ask`, `/coaching` 1건당 OpenRouter 호출 비용 발생 (임베딩 ~$0.00001 + LLM ~$0.0004~0.0005). 악의적 사용자 또는 봇이 무한 호출하면 비용 폭증. 동일 IP에서 연속 호출하면 다른 정상 사용자도 429에 걸릴 수 있음.

### Decision

**IP 기반 분당 30회 + Redis Lua script atomic 처리**

| 항목 | 값 |
|---|---|
| 기준 | 클라이언트 IP (`X-Forwarded-For` 첫 번째 IP, 없으면 `request.client.host`) |
| 윈도우 | 1분 (UTC 분 단위, 키 형식 `ratelimit:{ip}:{YYYY-MM-DDTHH:MM}`) |
| 한도 | `RATE_LIMIT_PER_MINUTE` (기본 30, 환경변수) |
| TTL | 60초 |
| 초과 시 | HTTP 429 + `"분당 요청 한도를 초과했습니다."` |

Redis Lua script (`app/middleware/rate_limit.py`):
```lua
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current and tonumber(current) >= limit then
    return -1
end

local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, ttl)
end
return count
```

Python 호출:
```python
minute_key = now.strftime("%Y-%m-%dT%H:%M")
key = f"ratelimit:{ip}:{minute_key}"
result = await get_redis().eval(_RATE_LIMIT_SCRIPT, 1, key, 60, RATE_LIMIT_PER_MINUTE)
if result == -1:
    raise HTTPException(status_code=429, ...)
```

### Why

#### 일일 → 분당으로 변경한 이유

코칭은 카드 한 장당 1회 호출이 자연스럽다. 게임 세션에서 1분에 30회를 초과하는 경우는 정상 사용자에게 거의 없으므로, 분당 한도가 일일 한도보다 더 정확한 abuse 탐지 기준이다.

일일 100회 → 분당 30회 전환으로 비용 폭증 위험을 더 빠르게 차단.

#### Lua script로 atomic 처리

단순 INCR + EXPIRE 분리 시 3가지 문제:
1. **INCR 후 EXPIRE 사이 race condition** → TTL 없는 영구 키 가능
2. **한도 초과 후에도 INCR 계속** → 카운터 무한 증가
3. **2번의 네트워크 라운드트립**

Lua script는 Redis 내부에서 atomic 실행 → 위 3가지 모두 해결.

#### X-Forwarded-For 처리

nginx 뒤에서는 `request.client.host`가 항상 proxy IP가 되어 모든 사용자가 한 IP로 묶임. `X-Forwarded-For` 헤더 첫 번째 IP가 실제 클라이언트 IP.

nginx location 블록에 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` 설정 필요 (handoff-to-infra.md 참고).

### Caution

- **X-Forwarded-For 신뢰성**: nginx를 거치지 않고 직접 노출된 환경에서는 클라이언트가 헤더 위조 가능. **반드시 nginx 뒤에 두어야** 신뢰 가능.
- **NAT 환경**: 같은 NAT 뒤 다수 사용자는 같은 IP로 보임 → 한 명이 한도를 다 쓰면 다른 사용자도 영향. 사용자 인증 붙기 전엔 불가피.
- **분 경계 burst**: `:59`초에 30회, `:00`초에 다시 30회 가능 (분 경계 리셋). 허용 범위로 판단.
- **Redis 다운 시**: rate limit 미들웨어가 예외를 잡아올리면 전체 요청 차단. fail-open(Redis 죽으면 통과) vs fail-closed(차단) 정책은 추후 결정.

### Test Plan

- 같은 IP에서 30회 연속 호출 → 31번째에서 429 확인
- 1분 경과 후 새 요청 → 새 키 생성, 카운터 1부터 시작
- `redis-cli GET ratelimit:{ip}:{minute}` → 카운터 확인
- `redis-cli TTL ratelimit:{ip}:{minute}` → 60초 이내 확인
- 한도 초과 후 추가 호출 → 카운터가 limit에서 멈추는지 확인
