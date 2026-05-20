# 인프라 팀 핸드오프 가이드 — AI 모듈

> AI 모듈 구현 완료. 로컬 개발은 `AI/` 폴더 안에서 self-contained하게 완성됨.
> 인프라 팀은 아래 "미완성 항목"의 통합 작업만 진행하면 됨.

## 컨테이너 정보

| 항목 | 값 |
|---|---|
| 포트 | 8000 |
| 헬스체크 | `GET /healthz` → `{"status": "ok"}` |
| 언어 이미지 | `python:3.11-slim` |
| Dockerfile | `AI/Dockerfile` |

## 필요한 환경변수

| 변수 | 설명 | 예시 |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API 키 | `sk-or-...` |
| `PINECONE_API_KEY` | Pinecone API 키 | |
| `PINECONE_HOST` | Pinecone 인덱스 Host URL | `https://lgi-progit-ko-xxx.svc.aped.pinecone.io` |
| `PINECONE_INDEX_NAME` | 인덱스 이름 | `lgi-progit-ko` |
| `REDIS_URL` | Redis 연결 URL | `redis://redis-ai:6379` |
| `CORS_ORIGINS` | 허용 origin (콤마 구분) | `https://lets-git-it.kr,https://dev.lets-git-it.kr` |
| `DAILY_LIMIT_PER_IP` | IP당 일일 최대 요청 수 | `100` |

## Redis 의존성

캐싱과 레이트 리밋에 Redis가 필요함. 두 가지 선택지:
- **신규 Redis 컨테이너 추가** (`redis-ai`) — 독립적, 권장
- **기존 `redis-auth` 공유** — 키 네임스페이스 분리 필요 (`rag:*`, `ratelimit:*`)

## nginx 라우팅 제안

> ⚠️ 실제 변경은 인프라 팀 판단에 따라 진행

`nginx/templates/api.conf.template`에 아래 location 블록 추가 (`location /ws` 위에):

```nginx
location /ai/ {
    proxy_pass http://fastapi:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # SSE 스트리밍을 위한 설정
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 60s;
}
```

`docker-compose.be.yml` 또는 신규 `docker-compose.fastapi.yml`에 fastapi 서비스 추가:
```yaml
fastapi:
  image: # CI/CD로 빌드된 이미지
  container_name: fastapi
  env_file: .env.fastapi
  networks:
    - letsgit-dev
  restart: always
```

## GitLab CI 제안

`.gitlab/deploy-dev.yml`에 AI 배포 job 추가:
```yaml
deploy-dev-fastapi:
  stage: deploy
  tags: [dev]
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
      changes:
        - AI/**/*
  script:
    - # docker build + restart
```

## API 명세

### `POST /ask`

**Request**
```json
{ "query": "git rebase" }
```

**Response** — `Content-Type: text/event-stream`

캐시 미스 시:
```
event: sources
data: [{"chapter": "Git 브랜치", "section": "Rebase 의 기초", "source": "book/...asc"}, ...]

event: token
data: {"text": "git rebase는"}

event: token
data: {"text": " 한 브랜치에서..."}

event: done
data: {"cached": false}
```

캐시 히트 시:
```
event: sources
data: [...]

event: cached
data: {"text": "전체 답변 텍스트"}

event: done
data: {"cached": true}
```

**에러**
- `422` — query 필드 누락
- `429` — IP 일일 한도 초과 (`DAILY_LIMIT_PER_IP`)

---

## 인증 통합

현재 `AI/app/middleware/auth.py`에 placeholder가 있음. BE의 JWT/세션 검증 방식 공유해주면 통합 가능.

## 미완성 항목 (핸드오프 시점 기준)

- [ ] nginx location 블록 적용
- [ ] fastapi 서비스 docker-compose 통합
- [ ] GitLab CI deploy job 추가
- [ ] Redis 운영 정책 결정 (신규 vs 공유)
- [ ] 인증 미들웨어 통합

## 운영 시 알아야 할 것

### Redis 메모리 정책
캐시(`rag:cache:*`, 7일 TTL)와 rate limit(`ratelimit:*`, 자정 만료)이 공존.
- BE Redis 공유 시: `maxmemory-policy=volatile-lru` 권장 (TTL 있는 키만 evict → BE 영구 키 보호)
- 신규 Redis 시: 기본 `allkeys-lru`로 충분

### Rate Limit이 UTC 자정 기준
한국 사용자는 새벽 9시(KST) 카운터 리셋. 자연스러운 KST 자정 리셋 원하면 코드 수정 필요 (`AI/app/middleware/rate_limit.py:34`).

### nginx X-Forwarded-For 헤더 필수
rate limit이 `X-Forwarded-For` 헤더의 첫 IP를 사용. nginx가 안 거치면 모든 사용자가 한 IP로 묶임 → rate limit 무력화. 직접 노출 금지.

### 캐시 무효화 방법
LLM 모델/프롬프트 변경 시 옛 답변이 7일간 반환됨. 수동 무효화:
```bash
redis-cli --scan --pattern "rag:cache:*" | xargs redis-cli DEL
```

### 헬스체크 의존성
`GET /healthz`는 단순 OK 응답. Redis/Pinecone/OpenRouter 다운 시에도 200 반환. 실제 동작 확인은 `POST /ask` 호출 필요.

## 상세 문서

- [모듈 개요](IMPLEMENTATION_RAG_OVERVIEW.md) — 처음 보는 팀원용, RAG 개념 + 용어 + 전체 흐름
- [AsciiDoc 파서](RAG/IMPLEMENTATION_ASCIIDOC_PARSER.md)
- [청킹 전략](RAG/IMPLEMENTATION_CHUNKING_STRATEGY.md)
- [임베딩 모델 선택](RAG/IMPLEMENTATION_EMBEDDING_MODEL.md)
- [벡터 검색 런타임](RAG/IMPLEMENTATION_VECTOR_SEARCH.md)
- [Redis 캐싱 전략](RAG/IMPLEMENTATION_CACHING_STRATEGY.md)
- [Rate Limiting](RAG/IMPLEMENTATION_RATE_LIMITING.md)
- [SSE 스트리밍 프로토콜](RAG/IMPLEMENTATION_STREAMING_PROTOCOL.md) — FE 구현 가이드 포함
- [에러 처리 설계](RAG/IMPLEMENTATION_ERROR_HANDLING.md)
