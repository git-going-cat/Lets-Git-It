# Rate Limiting 전략

### Background / Context

`/ask` 1건당 OpenRouter 호출 비용 발생 (임베딩 ~$0.00001 + LLM ~$0.0005). 악의적 사용자 또는 봇이 무한 호출하면 비용 폭증. 또한 동일 사용자가 연속 호출하면 LLM rate limit (OpenRouter 분당 한도)에 걸려 다른 정상 사용자도 영향받음.

학교 프로젝트 / MVP 단계라 OpenRouter 월 $8 한도가 빠르게 소진될 수 있어 보호 장치 필수.

### Decision

**IP 기반 일일 한도 + Redis Lua script atomic 처리**

| 항목 | 값 |
|---|---|
| 기준 | 클라이언트 IP (`X-Forwarded-For` 우선, 없으면 `request.client.host`) |
| 윈도우 | 자정(UTC) 기준 24시간 |
| 한도 | `DAILY_LIMIT_PER_IP` (기본 100, 환경변수) |
| 키 | `ratelimit:<ip>:<YYYY-MM-DD>` |
| 초과 시 | HTTP 429 + `"일일 요청 한도를 초과했습니다."` |

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
result = await get_redis().eval(_RATE_LIMIT_SCRIPT, 1, key, ttl, DAILY_LIMIT)
if result == -1:
    raise HTTPException(status_code=429, ...)
```

### Why

#### IP 기반 선택

| 옵션 | 장점 | 단점 |
|---|---|---|
| **IP 기반 (선택)** | 인증 시스템 없이 가능, 익명 사용자 차단 | 같은 NAT 뒤 사용자는 공유, VPN 우회 가능 |
| 사용자 ID 기반 | 정확함 | BE 인증 통합 전엔 불가, 익명 사용자 차단 못 함 |
| API key 기반 | 사용자별 분리 | 키 발급/관리 인프라 필요 |

BE 인증 미들웨어 통합 전이라 IP 기반이 현실적. 추후 인증 붙으면 `ratelimit:<user_id>:<date>` 키로 전환 가능.

#### Lua script로 atomic 처리

**원래 구현 (버그 있었음)**:
```python
count = await redis.incr(key)
if count == 1:
    await redis.expire(key, ttl)  # 두 번째 라운드트립
if count > DAILY_LIMIT:
    raise HTTPException(...)
```

세 가지 문제:
1. **INCR 후 EXPIRE 사이 race condition**: 동시 요청 시 EXPIRE 누락 가능 → TTL 없는 영구 키 생성
2. **한도 초과 후에도 INCR 계속**: 100 초과해도 매번 INCR → 카운터가 무한히 커짐 (메모리 낭비 + 정수 오버플로 위험)
3. **2번의 네트워크 라운드트립**

Lua script는 Redis 내부에서 **atomic하게 실행**되므로:
1. GET + INCR + EXPIRE가 한 번에 처리 → race condition 없음
2. limit 이상이면 INCR 자체를 안 함 → 카운터가 limit에 고정
3. 1번의 라운드트립

#### 자정 기준 (UTC)

매 요청마다 정확히 24시간 후 만료가 아니라, **그날 자정에 일괄 리셋** 방식. 사용자 입장에서 "오늘은 N개 썼다"가 직관적이고, "한 번에 100개 쓰고 1분 뒤 또 쓸 수 있게" 같은 burst 우회를 방지.

TTL 계산 (`rate_limit.py:35-36`):
```python
tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
ttl = int((tomorrow - now).total_seconds())
```

#### X-Forwarded-For 처리

nginx/reverse proxy 뒤에서는 `request.client.host`가 항상 proxy IP가 되어 모든 사용자가 한 IP로 묶임. `X-Forwarded-For` 헤더의 첫 IP가 실제 클라이언트 IP:

```python
forwarded = request.headers.get("X-Forwarded-For")
ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
```

### Caution

- **X-Forwarded-For 신뢰성**: 직접 노출(nginx 안 거치는) 환경에서는 클라이언트가 헤더 위조해서 우회 가능. **반드시 nginx 뒤에 두어야** 신뢰 가능. nginx는 client→서버 방향으로 `X-Forwarded-For`를 덮어쓰므로 안전
- **자정 기준이 UTC**: 한국 사용자는 새벽 9시(KST = UTC+9 자정)에 카운터 리셋됨. 운영팀이 자연스러운 KST 자정 리셋을 원하면 `datetime.now(timezone(timedelta(hours=9)))` 로 변경 필요
- **NAT 환경**: 학교/회사 같은 NAT 뒤 다수 사용자는 같은 IP로 보임 → 한 명이 한도를 다 쓰면 다른 사용자도 영향. 사용자 인증 붙기 전엔 어쩔 수 없음
- **카운터 표시 안 함**: 응답 헤더에 `X-RateLimit-Remaining` 같은 거 없음. 필요하면 추가 가능
- **Redis 다운 시 전체 장애**: cache와 마찬가지로 Redis 의존. 향후 fail-open(Redis 죽으면 통과) vs fail-closed(차단) 정책 결정 필요

### Test Plan

- 정상 호출 → Redis `GET ratelimit:<IP>:<TODAY>` 카운터 확인
- `redis-cli TTL ratelimit:<IP>:<TODAY>` → 자정까지 남은 초
- 한도 직전까지 호출 후 1번 더 → 429 확인
- 한도 초과 후 추가 호출 → 카운터가 limit에서 멈추는지 확인 (limit+1, limit+2로 증가하지 않음)
- 자정 통과 후 새 요청 → 새 키 생성, 카운터 1부터 시작
