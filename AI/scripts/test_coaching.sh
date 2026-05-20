#!/bin/bash
set -e

BASE_URL="http://localhost:8000"
API_KEY="${AI_API_KEY:-changeme-local-dev}"

echo "=== 1. healthz ==="
curl -s "$BASE_URL/healthz"
echo

echo "=== 2. coaching (정상) ==="
curl -s -X POST "$BASE_URL/coaching" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userInput":"git restore .env","correctCommand":"git restore --staged .env","cardId":"card-3","score":60}'
echo

echo "=== 3. coaching (인증 실패 → 401) ==="
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/coaching" \
  -H "Content-Type: application/json" \
  -d '{"userInput":"test","correctCommand":"test","cardId":"c1","score":0}'
echo
