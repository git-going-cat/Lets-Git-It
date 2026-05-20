import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request

from app.redis_client import get_redis

DAILY_LIMIT = int(os.getenv("DAILY_LIMIT_PER_IP", "100"))

# 리버스 프록시 뒤에 배치된 경우에만 true. 직접 노출 환경에서 true로 두면
# 클라이언트가 X-Forwarded-For 헤더를 임의로 주입해 rate limit 우회 가능
TRUST_FORWARDED_FOR = os.getenv("TRUST_FORWARDED_FOR", "false").lower() == "true"

# INCR + EXPIRE를 atomic하게 실행하고, limit 초과 시 INCR 자체를 수행하지 않음
# (limit 도달 후에도 INCR이 계속되면 카운터가 무한히 증가하는 문제 방지)
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
    if TRUST_FORWARDED_FOR:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # 프록시가 append한 가장 오른쪽 IP가 신뢰 가능한 직전 hop
            return forwarded.split(",")[-1].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def check_rate_limit(request: Request) -> None:
    ip = _get_client_ip(request)

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    key = f"ratelimit:{ip}:{today}"

    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    ttl = int((tomorrow - now).total_seconds())

    result = await get_redis().eval(_RATE_LIMIT_SCRIPT, 1, key, ttl, DAILY_LIMIT)
    if result == -1:
        raise HTTPException(status_code=429, detail="일일 요청 한도를 초과했습니다.")
