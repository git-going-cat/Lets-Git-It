#!/bin/bash
set -e

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/develop/S14P31A304}"
INFRA_DIR="$PROJECT_DIR/INFRA"
COMPOSE_FILE="$INFRA_DIR/docker-compose.ai.yml"

echo "[AI 배포] 빌드 및 실행 시작"

# redis-ai 먼저 기동 (ingest 전 필요 없지만 depends_on 충족용)
docker compose -f "$COMPOSE_FILE" up -d --build redis-ai

# embeddings.npy 없으면 최초 1회 ingest 실행
EMBEDDINGS_FILE="$PROJECT_DIR/AI/data/embeddings.npy"
if [ ! -f "$EMBEDDINGS_FILE" ]; then
  echo "[AI] embeddings.npy 없음 - ingest 실행 중 (시간이 걸릴 수 있습니다)..."
  docker compose -f "$COMPOSE_FILE" run --rm rag-fastapi python scripts/ingest.py --index
  echo "[AI] ingest 완료"
fi

docker compose -f "$COMPOSE_FILE" up -d rag-fastapi

# 헬스체크 루프 (최대 100초, 5초 간격 x 20)
echo "[헬스체크] rag-fastapi 응답 대기 중..."

for i in $(seq 1 20); do
  RESPONSE=$(docker exec rag-fastapi curl -sf http://localhost:8000/healthz || true)

  echo "[DEBUG] health response: $RESPONSE"

  if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "[헬스체크] 통과 ($i번째 시도)"
    break
  fi

  if [ "$i" -eq 20 ]; then
    echo "[헬스체크] 실패 - 배포 중단"
    echo "[DEBUG] rag-fastapi logs:"
    docker logs rag-fastapi --tail 50 || true
    exit 1
  fi

  echo "[헬스체크] 대기 중... ($i/20)"
  sleep 5
done

# nginx reload (ai.conf.template 반영)
docker exec nginx nginx -s reload
echo "[Nginx] ai 라우팅 활성화 완료"

echo "[AI 배포] 완료 ✓ rag-fastapi 서비스 중"