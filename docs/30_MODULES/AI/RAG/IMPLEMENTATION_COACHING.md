# 코칭 엔드포인트 (`/coaching`)

### Background / Context

게임에서 사용자가 Git 명령어 카드의 정답을 입력하면, FE는 enum 기반으로 채점한 score(0~100)와 함께 `userInput`, `correctCommand`, `cardId`를 AI 서버로 보낸다. AI 서버는 RAG 컨텍스트를 활용해 짧고 핵심적인 코칭(1~2문장)을 반환한다.

`/ask`(SSE 스트리밍 자유 챗봇)와 달리 `/coaching`은:
- 입력이 자연어 질문이 아니라 **Git 명령어**
- 응답이 짧음 (1~2문장) → SSE 불필요, **단일 JSON 응답**
- 입력 공간이 좁아 캐시 적중률이 매우 높음

### Decision

**입력 유형에 따라 두 경로로 분기**

```
POST /coaching {userInput, correctCommand, cardId, score}
  ↓
  Pydantic 검증 (1~200자, strip)
  ↓
  Rate limit (Redis Lua, 분당 30회)
  ↓
  is_git_like(userInput)?
  ├── True  → 개인화 코칭 (PERSONAL)
  │           cache key: (userInput, correctCommand) 해시
  │           prompt: COACHING_PERSONAL_PROMPT
  │           user msg: "사용자 입력: ...\n정답 명령어: ..."
  └── False → correctCommand 설명 (SYSTEM)
              cache key: correctCommand 해시
              prompt: COACHING_SYSTEM_PROMPT
              user msg: "명령어: <correctCommand>"
  ↓
  Redis 캐시 조회 (HIT → 즉시 반환)
  ↓
  RAG 검색 → context 빌드 → LLM 호출 (json_mode)
  ↓
  JSON 파싱 → coaching 추출 → 캐시 저장 → 반환
  
  실패 시 (search/LLM/파싱/빈 응답): fallback `정답 명령어: \`...\`` 반환
```

### 입력 검증 — `is_git_like()`

`app/git_validator.py:14`:

```python
def is_git_like(text: str) -> bool:
    if re.search(r"[가-힣]", text):
        return False
    parts = text.strip().lower().split()
    if not parts:
        return False
    if parts[0] == "git":
        return len(parts) > 1 and parts[1] in _GIT_SUBCOMMANDS
    return parts[0] in _GIT_SUBCOMMANDS
```

- 한글 포함 → False
- `git <subcommand>` 형태 → 화이트리스트 통과 시 True
- `<subcommand>` bare 형태 → 화이트리스트 통과 시 True

`_GIT_SUBCOMMANDS`는 git 공식 서브커맨드 41개를 frozenset으로 보관 (add, restore, reset, rebase, ...).

`is_git_like()`가 False인 입력(한글/영어 무관/자연어/prompt injection)은 422가 아니라 **edge case 경로로 분기**되어 `correctCommand` 설명을 받음. 422 차단보다 사용자 경험이 자연스러움.

### 캐시 전략

`app/rag/cache.py`:

| 키 | 함수 | 용도 |
|---|---|---|
| `rag:coaching:<sha256(_norm(userInput):_norm(correctCommand))>` | `make_coaching_cache_key()` | 개인화 코칭 |
| `rag:command:<sha256(_norm(correctCommand))>` | `make_command_cache_key()` | correctCommand 설명 |

`_norm(s)` = `" ".join(s.split())` → 중복 공백 제거. **대소문자는 보존** — HEAD/head, README.md/readme.md, Feature/feature가 Git에서 의미상 다를 수 있어 소문자화하지 않음. `"git restore  --staged"` (공백 2) 와 `"git restore --staged"` 만 동일 키로 합쳐짐.

**왜 두 키를 분리하나:**
- 같은 카드에서 정상 git 입력과 edge case 입력은 코칭 내용이 다름 (개인화 vs 정답 명령어 설명)
- 키 prefix가 달라 충돌 없음
- correctCommand가 같은데 userInput만 다른 정상 입력 50개는 50개 캐시 엔트리지만, 카드 정답이 정해져 있어 사실상 게임 카드 수 × (사용자 입력 변형 수)로 제한됨

TTL 7일. 카드 정답은 게임 패치 외엔 안 바뀌므로 충분.

### 프롬프트 두 갈래 — `app/prompts.py`

**`COACHING_SYSTEM_PROMPT`** (edge case용)
- `{correctCommand}`만 받음
- "명령어가 무엇을 하는지 + 의미상 동등한 대안 형태" 설명

**`COACHING_PERSONAL_PROMPT`** (정상 git 입력용)
- `{userInput}`, `{correctCommand}` 모두 받음
- 규칙 1: 동일/동등하면 그 점을 먼저 + 명령어 설명 ("동일합니다" 단답 금지)
- 규칙 2: 다른 명령어면 사용자 입력을 먼저 설명 + 정답 차이
- 규칙 3: bare 명령어면 `git`을 앞에 붙여야 한다고 안내 + `git XXX`로 해석해 설명

두 프롬프트 모두 응답을 `{"coaching": "..."}` JSON 형식으로 강제. LLM 호출 시 `json_mode=True`로 OpenRouter `response_format`을 켬.

### LLM 호출 — `json_mode`

`app/llm.py:26`:

```python
async def call_chat_json(messages, max_tokens=512, json_mode=False):
    kwargs = {
        "model": PREFERRED_MODELS[0],
        "messages": messages,
        "max_tokens": max_tokens,
        "extra_body": {"models": PREFERRED_MODELS},
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    ...
```

`json_mode=True`이면 OpenRouter가 JSON 객체 반환을 강제. fallback 체인의 모델이 미지원이면 plain text가 올 수 있으므로 코칭에서는 `json.loads()` 실패 시 raw text로 폴백한다 (다중 안전망).

### Fallback 동작

`app/rag/coaching.py:32-57`:

검색/LLM/JSON 파싱/빈 응답 모두 단일 `try` 블록에 묶여 있다. 어떤 단계든 실패하면:

```python
return {
    "coaching": f"정답 명령어: `{correct_command}`",
    "modelUsed": "fallback",
    "latencyMs": 0,
    "sourceChunks": [],
    "cached": False,
}
```

- FE는 항상 `coaching` 필드를 받음 (200)
- `modelUsed: "fallback"`으로 모니터링에서 식별 가능
- fallback은 캐시 저장 안 함 (다음 요청은 다시 정상 시도)
- 로그 라벨: `coaching.fallback` (grep으로 fallback 비율 트래킹 가능)

### Why

#### 왜 SSE가 아닌 JSON 단일 응답?

코칭은 1~2문장이므로 TTFT 최적화 의미 없음. SSE는 클라이언트 파싱이 복잡해지고 캐시 히트 시 또 다른 이벤트 흐름이 필요. 단일 JSON으로 짧은 응답을 받는 게 단순하고 일관적.

#### 왜 edge case에 422를 안 쓰나?

422는 "재시도하면 통과 가능한 에러"의 의미가 강함. 실제 게임 UX에서 사용자가 한글로 답을 적었다면 그건 답을 모르겠다는 시그널 → 정답 설명을 보여주는 게 자연스러움. 422 + FE fallback도 가능하지만 서버에서 한 번에 처리하는 게 응답 일관성이 좋음.

#### 왜 `userInput`에 대한 위험 명령어(`rm -rf`) 추가 차단을 안 하나?

`git rm`은 실제 git 서브커맨드라 `rm`이 화이트리스트에 포함된다. bare `rm -rf .`은 `git rm -rf .`로 해석되어 personalized 경로로 들어가지만, 실제 명령 실행은 절대 없음 (LLM이 텍스트로 설명만 함). 보안 위험이 없는 단순 텍스트 입력일 뿐.

#### 왜 `score`, `cardId`를 LLM에 안 보내나?

- `score`: FE의 enum 기반 채점이라 의미상 동등한 정답을 0점 처리할 가능성이 있음. LLM이 점수를 진실로 받으면 잘못된 코칭 가능. LLM은 `userInput`과 `correctCommand`만 보고 직접 판단.
- `cardId`: 캐시 키에 포함하지 않음으로써 동일 명령어를 사용하는 카드들이 캐시를 공유함. LLM도 카드 식별 없이 명령어만 봄.

두 필드는 라우터에서 받아 로그에만 활용 (모니터링/디버그용).

### API

#### `POST /coaching`

**Headers:** `X-API-Key: <AI_API_KEY>`

**Request:**
```json
{
  "userInput": "git restore --staged .env",
  "correctCommand": "git restore --staged .env",
  "cardId": "card-3",
  "score": 100
}
```

**Response:**
```json
{
  "coaching": "`git restore --staged .env`는 스테이징된 .env 파일을 unstage합니다...",
  "modelUsed": "google/gemini-2.5-flash-lite",
  "latencyMs": 729,
  "sourceChunks": [
    {"chapter": "git-restore", "section": "OPTIONS"}
  ],
  "cached": false
}
```

**에러 코드:**
| 코드 | 원인 |
|---|---|
| 401 | X-API-Key 헤더 누락 또는 불일치 |
| 422 | 요청 필드 누락 / 1~200자 범위 벗어남 / 빈 문자열 |
| 429 | IP 분당 30회 초과 |

**LLM/검색 실패 시:** 200 + `modelUsed: "fallback"` + `coaching: "정답 명령어: \`...\`"`

### Caution

- **`json_mode` 모델 호환성**: Gemini/GPT 외 다른 fallback 모델이 `response_format`을 무시하면 plain text가 옴. `json.loads()` 실패 시 raw text를 사용하므로 응답은 깨지지 않지만 형식이 LLM마다 다를 수 있음.
- **JSON 파싱 타입 안전성**: `parsed.get("coaching")` 값이 문자열이 아니면(예: number, list, bool) raw로 폴백. `isinstance(v, str) and v` 체크로 잘못된 형식이 응답에 노출되지 않음.
- **캐시 무효화**: 프롬프트 변경 시 옛 응답이 7일 잔존. 변경 시 수동 `redis-cli --scan --pattern "rag:coaching:*" | xargs redis-cli DEL` 및 `rag:command:*` 동일 처리 필요.
- **`is_git_like` 한계**:
  - bare `rm`이 허용됨 (`git rm` 때문) → `rm -rf .`은 personalized 경로로 분기됨. 위험 없음 (LLM이 텍스트로만 답)
  - 영어 자연어 혼합 (`git restore tell me what this does`)은 화이트리스트 통과 → 추후 강화 가능
- **score, cardId가 dead field 아님**: 라우터에서 `logger.info`로 기록만 함. 모니터링/디버깅에 활용.

### Test Plan

- `bash scripts/test_coaching.sh` 실행:
  - 기준선 (부분 정답 / 완벽 정답)
  - A. 다른 git 명령어
  - B. 파일 오지정
  - C. bare 명령어 (`git` 접두어 누락)
  - D-1. `git reset --hard`, D-2. `rm -rf`
  - E. 자연어 질문, F. 무관 텍스트, G. prompt injection → edge case 경로
  - N. 존재하지 않는 cardId → 200 (cardId는 캐시 키 아님)
  - P/Q. 인증 누락/오류 → 401
- 응답 검증:
  - score=100 케이스에 "동일합니다" 단답이 나오지 않는지
  - bare 입력에 "`git`을 앞에 붙여야 합니다"가 포함되는지
  - edge case 입력은 `correctCommand` 설명만 돌아오는지
  - 동일 입력 2회 호출 시 두 번째가 `cached: true`인지
- 로그 확인:
  - `coaching: card=... score=... input=...` 한 줄씩 출력되는지
  - 실패 케이스에 `Coaching generation failed — returning fallback` 트레이스가 찍히는지
