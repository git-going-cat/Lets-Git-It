# Redis 캐싱 전략

### Background / Context

`/ask` 응답 1건 생성에는 다음 비용이 든다:
1. OpenRouter 임베딩 호출 (질문 → 1536차원 벡터, ~50ms)
2. Pinecone 벡터 검색 (~100ms)
3. OpenRouter gpt-4o-mini 스트리밍 (4~8초)
4. 토큰 비용 (입력 컨텍스트 ~3000 토큰 + 출력 ~500 토큰)

같은 질문이 반복되면 위 4단계를 매번 새로 수행 → 비용·지연 낭비. 게임에서 사용자들이 같은 문제 상황에 같은 명령어를 입력하는 패턴이 예상되므로 캐싱으로 큰 효과를 볼 수 있다.

### Decision

**Redis 기반 exact-match 캐시** (SHA-256 해시 키, TTL 7일, JSON 직렬화). `/ask`(자연어 질문)와 `/coaching`(명령어)에서 모두 사용. 키 네임스페이스로 용도 구분.

| 키 prefix | 함수 | 용도 |
|---|---|---|
| `rag:cache:<sha256>` | `make_cache_key(query)` | `/ask` 응답 캐시 |
| `rag:coaching:<sha256>` | `make_coaching_cache_key(userInput, correctCommand)` | `/coaching` 개인화 응답 |
| `rag:command:<sha256>` | `make_command_cache_key(correctCommand)` | `/coaching` edge case 응답 (correctCommand 설명) |

값은 모두 `{"answer"/"coaching": str, "sources"/"sourceChunks": list, ...}` JSON. TTL 604800초 (7일).

키 생성 (`app/rag/cache.py`):
```python
def _norm(s: str) -> str:
    return " ".join(s.split())  # 공백만 정규화, 대소문자 보존

def make_cache_key(query: str) -> str:
    return "rag:cache:" + hashlib.sha256(_norm(query).encode()).hexdigest()

def make_coaching_cache_key(user_input: str, correct_command: str) -> str:
    normalized = f"{_norm(user_input)}:{_norm(correct_command)}"
    return "rag:coaching:" + hashlib.sha256(normalized.encode()).hexdigest()

def make_command_cache_key(correct_command: str) -> str:
    return "rag:command:" + hashlib.sha256(_norm(correct_command).encode()).hexdigest()
```

`_norm()`은 중복 공백 제거만 함. **대소문자는 보존** — `HEAD` vs `head`, `README.md` vs `readme.md`, `Feature` vs `feature`는 Git에서 의미상 다를 수 있어 의도적으로 소문자화하지 않음. `"git restore  --staged"` (공백 2개) 와 `"git restore --staged"`만 동일 키로 매칭됨.

흐름:
1. 요청 도착 → `make_cache_key(query)`
2. `GET rag:cache:xxx`
   - HIT → SSE에서 `event: cached` 단발 응답 (token 스트림 없음)
   - MISS → LLM 호출, 응답 완료 후 `SETEX` 저장

### Why

#### exact-match vs semantic cache

| 옵션 | 캐시 키 | 장점 | 단점 |
|---|---|---|---|
| **exact-match (선택)** | 질문 해시 | 단순, 빠름 (~1ms), 추가 비용 0 | 표현 다르면 미스 |
| semantic cache | 질문 임베딩 + 유사도 검색 | 표현 차이 흡수 | 매 요청 임베딩 호출(비용·지연 발생), 복잡도↑, 오답 위험 |

**우리 서비스의 입력은 자연어 질문이 아니라 명령어**다 (예: `git rebase main`). 명령어는 표현 다양성이 거의 없어 exact-match 적중률이 충분히 높다. semantic cache는 매 요청마다 임베딩 API를 또 호출해야 하는데, 이는 캐시의 가장 큰 효용(LLM 호출 회피)을 깎아먹는다.

#### 키 정규화 (`_norm()`)

- 중복 공백 제거 (`git  push` == `git push`) — `" ".join(s.split())`
- 앞뒤 공백 자동 처리 (`split()`이 무시)
- **대소문자 보존** — Git의 ref/path/branch는 대소문자 구분 (HEAD ≠ head, Feature ≠ feature, README.md ≠ readme.md on Linux). 소문자화 시 잘못된 캐시 적중 위험

코칭 엔드포인트에서 사용자가 의도적/실수로 공백을 다르게 입력해도 동일 키로 모임 → 캐시 적중률 ↑. `/ask`도 동일 적용으로 일관성 유지.

더 강한 정규화(특수문자 제거, 소문자화 등)는 명령어 의미를 왜곡할 수 있어 적용하지 않음.

#### TTL = 7일

- Pro Git 책 내용은 정적이라 답변도 변하지 않음 → 길게 잡아도 안전
- LLM 모델 업그레이드 또는 SYSTEM_PROMPT 변경 시에는 stale → 캐시 키 prefix 버전 도입 또는 Redis FLUSHBY pattern으로 무효화 필요 (현재 미구현, [[caching-versioning]] 참고)
- 7일 = 게임 1주기 정도 가정

#### Redis 선택 이유

- BE에서 이미 사용 중 → 추가 인프라 학습 부담 없음
- TTL 지원 (`SETEX`) — 메모리 자동 정리
- 키 네임스페이스 (`rag:cache:`) — BE 키와 충돌 방지
- atomic 연산 (rate limiting Lua script와 동일 인스턴스 활용 가능)

### Caution

- **Redis 메모리 관리**: 7일 TTL이지만 트래픽 많으면 누적. 운영 시 `maxmemory` + `maxmemory-policy=volatile-lru` 권장 (BE 키 보호)
- **캐시 키 버전 부재**: 모델/프롬프트 변경 시 옛 응답이 7일간 반환됨. 변경 시 수동으로 `redis-cli --scan --pattern "rag:cache:*" | xargs redis-cli DEL` 실행 필요
- **부분 응답 캐싱 안 함**: LLM 스트림 중 실패하면 캐시 저장하지 않음 (`answer.py`에서 `has_error` 체크) — 다음 동일 질문은 다시 호출됨, 의도된 동작
- **캐시 실패는 클라이언트에 영향 없음**: `set_cached` 호출이 예외를 던져도 응답 자체는 정상 완료 (`answer.py` finally 블록 참고)
- **Redis 다운 시 전체 장애**: cache + rate_limit 모두 Redis 의존. Redis 죽으면 `/ask` 전체 실패 — 향후 graceful degradation 고려 가능

### Test Plan

- `scripts/test_cache.py` 실행 → set + get 라운드트립 확인
- 같은 질문 2회 호출 → 두 번째에 `event: cached` 확인 (`event: done`에 `cached: true`)
- Redis `redis-cli KEYS rag:cache:*`로 키 존재 확인
- `redis-cli TTL rag:cache:xxx`로 7일 TTL 확인 (604800초 근처)
