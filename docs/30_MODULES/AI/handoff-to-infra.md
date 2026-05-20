# 인프라 팀 핸드오프 가이드 — AI 모듈

> 작업 순서대로 따라가면 됩니다. 각 항목은 독립 작업이므로 막히면 건너뛰고 나중에 처리해도 됩니다.

---

## 체크리스트

- [ ] 1. nginx location 블록 추가
- [ ] 2. `INFRA/docker-compose.ai.yml` 생성
- [ ] 3. EC2에 `.env.ai` 생성
- [ ] 4. EC2에서 최초 1회 `embeddings.npy` 생성
- [ ] 5. `INFRA/deploy-ai.sh` 생성
- [ ] 6. `.gitlab/deploy-dev.yml`에 AI deploy job 추가

---

## 1. nginx location 블록

`nginx/conf/` 또는 nginx 설정 파일에 아래 블록 추가 (`location /ws` 위에):

```nginx
location /ai/ {
    proxy_pass http://fastapi:8000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    client_max_body_size 8k;
}
```

**trailing slash 필수** — `proxy_pass http://fastapi:8000/;` 에서 슬래시가 없으면 FastAPI에 `/ai/ask`로 전달돼 404.

---

## 2. INFRA/docker-compose.ai.yml 생성

```yaml
services:
  fastapi:
    build:
      context: ../AI
      dockerfile: ../AI/Dockerfile
    container_name: fastapi
    env_file:
      - .env.ai
    expose:
      - "8000"
    restart: always
    networks:
      - letsgit-dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis-ai:
    image: redis:7-alpine
    container_name: redis-ai
    restart: always
    networks:
      - letsgit-dev

networks:
  letsgit-dev:
    name: letsgit-dev
    external: true
```

---

## 3. EC2에 .env.ai 생성

`/home/ubuntu/develop/S14P31A304/INFRA/.env.ai`:

```
OPENROUTER_API_KEY=sk-or-...
AI_API_KEY=<충분히 긴 랜덤 문자열>
REDIS_URL=redis://redis-ai:6379
CORS_ORIGINS=https://lets-git-it.kr,https://dev.lets-git-it.kr
RATE_LIMIT_PER_MINUTE=30
```

`AI_API_KEY`는 FE 팀에 공유 필요 (FE가 `X-API-Key` 헤더로 전송).

---

## 4. EC2 최초 1회 — embeddings.npy 생성

`data/embeddings.npy`는 gitignore 처리되어 있어 Docker 빌드 전 EC2에서 직접 생성해야 합니다. **최초 1회만** 필요하며, Pro Git 데이터가 바뀌지 않는 한 재생성 불필요.

```bash
cd /home/ubuntu/develop/S14P31A304/AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# OPENROUTER_API_KEY 필요
export OPENROUTER_API_KEY=sk-or-...
python scripts/ingest.py --index
# 완료 시 data/embeddings.npy 생성됨 (약 3.5MB)

deactivate
```

이후 `docker compose -f INFRA/docker-compose.ai.yml up --build` 시 `COPY . .`가 `embeddings.npy`를 이미지에 포함시킵니다.

---

## 5. INFRA/deploy-ai.sh 생성

```bash
#!/bin/bash
set -e

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/develop/S14P31A304}"
COMPOSE_FILE="$PROJECT_DIR/INFRA/docker-compose.ai.yml"

echo "[AI 배포] 시작"

docker compose -f "$COMPOSE_FILE" up -d --build fastapi

echo "[헬스체크] fastapi 응답 대기 중..."
for i in $(seq 1 20); do
  if docker exec fastapi curl -sf http://localhost:8000/healthz > /dev/null 2>&1; then
    echo "[헬스체크] 통과 ($i번째 시도)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "[헬스체크] 실패 — 로그 확인:"
    docker logs fastapi --tail 50
    exit 1
  fi
  echo "[헬스체크] 대기 중... ($i/20)"
  sleep 5
done

echo "[AI 배포] 완료 ✓"
```

---

## 6. .gitlab/deploy-dev.yml에 AI job 추가

기존 `deploy-dev-fe` job 아래에 추가:

```yaml
deploy-dev-ai:
  stage: deploy
  image: docker:latest
  tags: [dev]
  before_script:
    - apk add --no-cache git curl bash
    - git config --global --add safe.directory /home/ubuntu/develop/S14P31A304
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
      changes:
        - AI/**/*
        - INFRA/docker-compose.ai.yml
        - INFRA/deploy-ai.sh
  script:
    - git config --global credential.helper store
    - cp /home/ubuntu/.git-credentials /root/.git-credentials
    - cd /home/ubuntu/develop/S14P31A304
    - git config pull.rebase false
    - git pull origin develop
    - bash INFRA/deploy-ai.sh
```

---

## 외부 엔드포인트

| 경로 | 메서드 | 용도 |
|---|---|---|
| `/ai/ask` | POST | 자유 챗봇 (SSE 스트림) |
| `/ai/coaching` | POST | 카드 코칭 (JSON) |
| `/ai/healthz` | GET | 헬스체크 |

## CORS / Rate limit / 인증 책임

| 항목 | 처리 위치 |
|---|---|
| CORS | FastAPI (`CORS_ORIGINS` 환경변수) |
| Rate limit | FastAPI (IP 기반 분당 30회) |
| 인증 | FastAPI (`X-API-Key` 헤더) |
| TLS | nginx |

**nginx가 할 일은 1번 location 블록 하나뿐.**

---

## API 명세

### POST /coaching (FE → AI)

**Request:**
```json
{
  "userInput": "git restore .env",
  "correctCommand": "git restore --staged .env",
  "cardId": "card-3",
  "score": 60
}
```

**Headers:** `X-API-Key: <AI_API_KEY>`

**Response:**
```json
{
  "coaching": "...",
  "modelUsed": "google/gemini-2.5-flash-lite",
  "latencyMs": 729,
  "sourceChunks": [...],
  "cached": false
}
```

**에러 코드:**
| 코드 | 원인 |
|---|---|
| 401 | X-API-Key 헤더 누락 또는 불일치 |
| 422 | 요청 필드 누락 |
| 429 | IP 분당 30회 초과 |
