# AI 모듈 — Pro Git RAG 시스템

사용자의 Git 질문에 Pro Git 2판 한국어판 내용을 근거로 답변하는 RAG(Retrieval-Augmented Generation) 서버.

## RAG가 뭔가요? (처음 보는 팀원용)

LLM(예: GPT-4o-mini)에게 Pro Git 책 전체를 매번 던져주면 토큰 한계(128K)를 넘고 비용이 폭증합니다. 또 "Git rebase 알려줘"라고만 물어보면 LLM이 학습한 일반 지식으로 답해서 우리 책의 정확한 표현/예시를 못 씁니다.

RAG는 **"관련 자료를 먼저 찾고 → 그 자료를 근거로 답변"** 방식입니다:

1. **사전 작업 (1회)**: Pro Git을 작은 조각(청크)로 자르고, 각 조각을 벡터로 변환해서 벡터DB에 저장
2. **요청 시**: 사용자 질문도 벡터로 변환 → 벡터DB에서 가장 비슷한 조각 5개 검색 → LLM에 "이 5개를 근거로 답해줘"라고 전달

효과:
- 토큰 비용 절감 (전체 책 대신 5개 청크만 보냄)
- 답변 정확도 향상 (Pro Git의 실제 표현 사용)
- 환각(hallucination) 감소 (자료에 없으면 "찾을 수 없음"으로 답변)

## 핵심 용어

| 용어 | 설명 |
|---|---|
| **청크(chunk)** | 책을 잘라낸 한 조각. 우리는 500~800 토큰 크기 |
| **토큰(token)** | LLM이 텍스트를 세는 단위. 한글 1자 ≈ 2~3 토큰, 영어 단어 1개 ≈ 1~2 토큰 |
| **임베딩(embedding)** | 텍스트를 1536개 숫자(벡터)로 변환. 의미가 비슷한 텍스트는 벡터도 비슷 |
| **벡터DB** | 벡터를 저장하고 "가장 비슷한 벡터" 검색을 빠르게 해주는 DB. Pinecone 사용 |
| **코사인 유사도** | 두 벡터의 유사도. -1~1 범위, 1에 가까울수록 비슷. 우리는 0.6 이상이면 양호 |
| **top_k** | 벡터 검색에서 "가장 유사한 K개 반환". 우리는 K=5 |
| **TTFT** | Time To First Token. 사용자가 첫 글자를 보기까지 걸리는 시간 |
| **SSE** | Server-Sent Events. HTTP로 서버→클라이언트 단방향 스트리밍 |
| **OpenRouter** | LLM/임베딩 API 게이트웨이. OpenAI/Anthropic/Google 모델 통합 호출 가능 |
| **Pinecone** | 매니지드 벡터DB 서비스. 1536차원 벡터 약 589개 저장 중 |
| **AsciiDoc** | 마크다운과 비슷한 문서 포맷. Pro Git 원본이 `.asc` 형식 |

## 기술 스택

| 항목 | 내용 |
|---|---|
| 소스 경로 | `/AI` |
| 언어 / 프레임워크 | Python 3.11 + FastAPI |
| 임베딩 | OpenRouter → `openai/text-embedding-3-small` (1536차원) |
| LLM | OpenRouter → `openai/gpt-4o-mini` |
| 벡터 DB | Pinecone Serverless (`lgi-progit-ko`, AWS us-east-1, 589개 벡터) |
| 캐싱 / 레이트리밋 | Redis |
| 응답 방식 | SSE 스트리밍 |

## 전체 흐름

### 빌드타임 (인덱싱, 1회성)

```
progit2-ko 저장소 clone (gitignore 됨, 약 50MB)
  ↓
AsciiDoc 파싱 (.asc → 텍스트 + 챕터/섹션 메타데이터)
  ↓ //////////  주석 블록(영어 원문) 필터링
청킹 (섹션 누적 + 슬라이딩 윈도우, tiktoken cl100k_base)
  ↓ 589개 청크 생성, avg 559 토큰
임베딩 (text-embedding-3-small, 100개씩 배치, tenacity retry)
  ↓ 청크당 1536차원 벡터
Pinecone upsert (metadata에 text 포함 → search 시 별도 조회 불필요)
```

실행 명령: `python scripts/ingest.py --all`

### 런타임 (사용자 요청마다)

```
POST /ask  {"query": "git rebase"}
  ↓
1. Pydantic 검증 (strip, 1~500자)
  ↓ 실패 시 422
2. Rate limit 체크 (Redis Lua script, IP별 일일 한도)
  ↓ 초과 시 429
3. 캐시 조회 (SHA256 해시 key, rag:cache:*)
  ├── HIT → event: sources → event: cached → event: done
  └── MISS ↓
4. query 임베딩 생성 (text-embedding-3-small)
  ↓
5. Pinecone top-5 검색
  ├── 0건 → "찾을 수 없음" 응답
  └── ≥1건 ↓
6. 청크들을 context로 GPT-4o-mini SSE 호출
  ↓ 토큰 단위 스트리밍
7. 응답 완료 후 Redis에 저장 (TTL 7일)
   event: sources → event: token (반복) → event: done
```

## API

### `POST /ask`

**Request**
```json
{ "query": "git rebase" }
```

**Response** — `Content-Type: text/event-stream`

이벤트 종류:

| 이벤트 | 시점 | 데이터 |
|---|---|---|
| `sources` | 스트림 시작 시 1회 | `[{chapter, section, source}, ...]` 5개 |
| `token` | LLM 응답 중 N회 | `{text: "조각"}` |
| `cached` | 캐시 히트 시 1회 (token 대신) | `{text: "전체 답변"}` |
| `error` | LLM 실패 시 1회 | `{message: "오류 메시지"}` |
| `done` | 마지막 1회 (항상) | `{cached: bool, error?: bool}` |

**1) 캐시 미스 (정상)**
```
event: sources
data: [{"chapter": "Git 브랜치", "section": "Rebase 의 기초", "source": "book/...asc"}, ...]

event: token
data: {"text": "git rebase는"}

event: token
data: {"text": " 한 브랜치에서..."}

event: done
data: {"cached": false, "error": false}
```

**2) 캐시 히트** — `token` 없이 `cached` 한 번에 전체 답변
```
event: sources
data: [...]

event: cached
data: {"text": "전체 답변 텍스트"}

event: done
data: {"cached": true}
```

**3) 검색 결과 0건**
```
event: sources
data: []

event: token
data: {"text": "제공된 자료에서 해당 내용을 찾을 수 없습니다."}

event: done
data: {"cached": false}
```

**4) LLM 실패 (네트워크/타임아웃 등)**
```
event: sources
data: [...]

event: error
data: {"message": "응답 생성 중 오류가 발생했습니다"}

event: done
data: {"cached": false, "error": true}
```

**에러 응답 (Content-Type: application/json, 스트림 아님)**

| 코드 | 원인 |
|---|---|
| 422 | query 누락 / 빈 문자열 / 공백만 / 500자 초과 |
| 429 | IP 일일 한도 초과 (`DAILY_LIMIT_PER_IP`, 기본 100) |

### `POST /coaching`

게임 카드 정답 채점 후 사용자에게 1~2문장 코칭을 반환. 자세한 설계는 [코칭 엔드포인트 문서](RAG/IMPLEMENTATION_COACHING.md) 참조.

**Headers:** `X-API-Key: <AI_API_KEY>`

**Request**
```json
{
  "userInput": "git restore --staged .env",
  "correctCommand": "git restore --staged .env",
  "cardId": "card-3",
  "score": 100
}
```

**Response** — `application/json` (단일 응답, SSE 아님)
```json
{
  "coaching": "...",
  "modelUsed": "google/gemini-2.5-flash-lite",
  "latencyMs": 729,
  "sourceChunks": [{"chapter": "git-restore", "section": "OPTIONS"}],
  "cached": false
}
```

LLM/검색 실패 시: 200 + `modelUsed: "fallback"` + `coaching: "정답 명령어: \`...\`"`

**에러 코드**

| 코드 | 원인 |
|---|---|
| 401 | X-API-Key 누락/오류 |
| 422 | 필드 누락 / 1~200자 범위 벗어남 / 빈 문자열 |
| 429 | IP 분당 30회 초과 |

(한글/자연어 입력은 422가 아니라 200 + correctCommand 설명으로 fallback)

### `GET /healthz`
```json
{"status": "ok"}
```

## 디렉토리 구조

```
AI/
├── app/
│   ├── main.py              FastAPI 앱 + CORS + 라우터 등록
│   ├── prompts.py           SYSTEM_PROMPT / COACHING_SYSTEM_PROMPT / COACHING_PERSONAL_PROMPT
│   ├── llm.py               OpenRouter 클라이언트 + json_mode 지원
│   ├── git_validator.py     is_git_like() 화이트리스트 검증 (라우터/코칭 공유)
│   ├── redis_client.py      Redis 싱글톤 (cache + rate_limit 공유)
│   ├── middleware/
│   │   ├── auth.py          X-API-Key 검증
│   │   └── rate_limit.py    IP별 분당 한도 (Lua script atomic)
│   ├── rag/
│   │   ├── search.py        query 임베딩 + 인메모리 numpy 코사인 검색
│   │   ├── cache.py         3종 cache key 함수 + _norm() 정규화
│   │   ├── context.py       chunks → 컨텍스트 문자열 (answer/coaching 공용)
│   │   ├── answer.py        /ask용 SSE 스트리밍 + 캐시 저장
│   │   └── coaching.py      /coaching 분기 로직 + fallback
│   └── routers/
│       ├── ask.py           POST /ask 엔드포인트
│       ├── coaching.py      POST /coaching 엔드포인트
│       └── health.py        GET /healthz
├── scripts/
│   ├── ingest.py            clone + parse + chunk + index 파이프라인
│   ├── test_connections.py  Phase 1 API 연결 테스트
│   ├── test_search.py       Phase 3 검색 동작 확인
│   ├── test_cache.py        Phase 4 캐시 동작 확인
│   └── eval_rag.py          RAG 품질 평가 (8개 샘플 쿼리)
├── data/
│   └── chunks.json          589개 청크 (인덱싱 산출물, 런타임 미사용)
├── Dockerfile               멀티스테이지 + healthcheck
├── docker-compose.yml       fastapi + redis 로컬 개발용
├── .dockerignore            .venv/, progit2-ko/, scripts/ 등 제외
└── requirements.txt
```

## 로컬 실행

```bash
cd AI
cp .env.example .env
# .env에 OPENROUTER_API_KEY, PINECONE_API_KEY, PINECONE_HOST 입력

# 가상환경 + 의존성
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 연결 테스트
python scripts/test_connections.py

# 인덱싱 (이미 했으면 SKIP됨)
python scripts/ingest.py --all

# 서버 실행
docker compose up
# 또는 개발용: uvicorn app.main:app --reload
```

## 관련 문서

### Phase별 구현
- [AsciiDoc 파서](RAG/IMPLEMENTATION_ASCIIDOC_PARSER.md) — Phase 2
- [청킹 전략](RAG/IMPLEMENTATION_CHUNKING_STRATEGY.md) — Phase 2
- [임베딩 모델 선택](RAG/IMPLEMENTATION_EMBEDDING_MODEL.md) — Phase 3
- [벡터 검색 런타임](RAG/IMPLEMENTATION_VECTOR_SEARCH.md) — Phase 3
- [Redis 캐싱 전략](RAG/IMPLEMENTATION_CACHING_STRATEGY.md) — Phase 4
- [SSE 스트리밍 프로토콜](RAG/IMPLEMENTATION_STREAMING_PROTOCOL.md) — Phase 5
- [Rate Limiting](RAG/IMPLEMENTATION_RATE_LIMITING.md) — Phase 5
- [에러 처리 설계](RAG/IMPLEMENTATION_ERROR_HANDLING.md)
- [코칭 엔드포인트 (`/coaching`)](RAG/IMPLEMENTATION_COACHING.md) — Phase 6

### 운영
- [인프라 팀 핸드오프 가이드](handoff-to-infra.md)
