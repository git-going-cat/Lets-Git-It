#!/bin/bash
set -e

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/develop/S14P31A304}"
DIST_DIR="$PROJECT_DIR/fe-dist"

set -a
source "$PROJECT_DIR/FE/.env"
set +a

echo "[FE 배포] 빌드 시작"

# FE 빌드 (임시 컨테이너)
docker build \
  --build-arg VITE_WS_URL="${VITE_WS_URL}" \
  -f "$PROJECT_DIR/INFRA/Dockerfile.fe" \
  -t fe-builder "$PROJECT_DIR"
docker rm fe-temp 2>/dev/null || true
docker create --name fe-temp fe-builder
mkdir -p "$DIST_DIR"
rm -rf "$DIST_DIR"/*
docker cp fe-temp:/app/dist/. "$DIST_DIR/"
docker rm fe-temp
docker rmi fe-builder

echo "[FE 배포] dist 교체 완료"

# nginx 최초 실행 or reload
if docker ps --filter "name=nginx" --filter "status=running" | grep -q nginx; then
  docker exec nginx nginx -s reload
  echo "[FE 배포] nginx reload 완료 (무중단)"
else
  docker compose -f "$PROJECT_DIR/INFRA/docker-compose.fe.yml" up -d nginx
  echo "[FE 배포] nginx 최초 실행 완료"
fi
