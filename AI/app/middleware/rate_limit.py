import os
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.redis_client import get_redis

RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))

# INCR + EXPIRE를 atomic하게 실행하고, limit 초과 시 INCR 자체를 수행하지 않음
_RATE_LIMIT_SCRIPT = """
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
"""


def _get_client_ip(request: Request) -> str:
    # nginx가 X-Real-IP $remote_addr로 설정 → TCP peer IP라 클라이언트 위조 불가.
    # X-Forwarded-For는 $proxy_add_x_forwarded_for로 append되어
    # leftmost가 클라이언트 통제값이라 안전하지 않음 → 의도적으로 사용 안 함.
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return "unknown"


async def check_rate_limit(request: Request) -> None:
    ip = _get_client_ip(request)

    now = datetime.now(timezone.utc)
    # Calendar-minute window (sliding 아님). 분 경계 burst(:59→:00)는
    # IMPLEMENTATION_RATE_LIMITING.md 참조 — 허용 범위로 판단.
    minute_key = now.strftime("%Y-%m-%dT%H:%M")
    key = f"ratelimit:{ip}:{minute_key}"

    result = await get_redis().eval(_RATE_LIMIT_SCRIPT, 1, key, 60, RATE_LIMIT_PER_MINUTE)
    if result == -1:
        raise HTTPException(status_code=429, detail="분당 요청 한도를 초과했습니다.")
