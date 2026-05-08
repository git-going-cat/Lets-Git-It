#!/bin/bash
set -e

PROJECT_DIR="/home/ubuntu/develop/S14P31A304"
INFRA_DIR="$PROJECT_DIR/INFRA"
NGINX_CONF_DIR="$PROJECT_DIR/nginx/conf"
ACTIVE_COLOR_FILE="$INFRA_DIR/.active_color"
COMPOSE_FILE="$INFRA_DIR/docker-compose.be.yml"

# 현재 active 색상 읽기 (최초 실행 시 blue 기본값)
if [ -f "$ACTIVE_COLOR_FILE" ]; then
  CURRENT=$(cat "$ACTIVE_COLOR_FILE")
else
  CURRENT="blue"
fi

# inactive 결정
if [ "$CURRENT" = "blue" ]; then
  NEXT="green"
  NEXT_PORT=8081
else
  NEXT="blue"
  NEXT_PORT=8080
fi

echo "[배포] 현재: spring-$CURRENT → 전환 대상: spring-$NEXT($NEXT_PORT)"

# inactive 빌드 및 실행
docker compose -f "$COMPOSE_FILE" up -d --build "spring-$NEXT"

# 헬스체크 루프 (최대 100초, 5초 간격 x 20)
echo "[헬스체크] spring-$NEXT 응답 대기 중..."

for i in $(seq 1 20); do
  RESPONSE=$(docker exec gitlab-runner \
    wget -qO- "http://spring-$NEXT:8080/actuator/health" || true)

  echo "[DEBUG] health response: $RESPONSE"

  if echo "$RESPONSE" | grep -q '"status":"UP"'; then
    echo "[헬스체크] 통과 ($i번째 시도)"
    break
  fi

  if [ "$i" -eq 20 ]; then
    echo "[헬스체크] 실패 - 배포 중단 및 롤백"

    echo "[DEBUG] spring-$NEXT logs:"
    docker logs "spring-$NEXT" || true

    docker compose -f "$COMPOSE_FILE" stop "spring-$NEXT" || true
    exit 1
  fi

  echo "[헬스체크] 대기 중... ($i/20)"
  sleep 5
done

# upstream 파일 교체
cat > "$NGINX_CONF_DIR/00-upstream.conf" <<EOF
# Blue-Green 배포 시 deploy.sh가 이 파일을 교체하고 nginx -s reload 수행
upstream backend {
    server spring-$NEXT:8080;
}
EOF

# nginx reload (무중단)
docker exec nginx nginx -s reload
echo "[Nginx] upstream → spring-$NEXT 전환 완료"

# 이전 컨테이너 중단
docker compose -f "$COMPOSE_FILE" stop "spring-$CURRENT" || true
echo "[배포] spring-$CURRENT 중단 완료"

# active 색상 저장
echo "$NEXT" > "$ACTIVE_COLOR_FILE"

echo "[배포] 완료 ✓ spring-$NEXT 서비스 중"