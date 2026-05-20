import hashlib
import json
from typing import Any

from app.redis_client import get_redis

CACHE_TTL = 604800  # 7일


def make_cache_key(query: str) -> str:
    return "rag:cache:" + hashlib.sha256(query.strip().lower().encode()).hexdigest()


def make_coaching_cache_key(card_id: str, user_input: str) -> str:
    normalized = f"{card_id}:{user_input.strip().lower()}"
    return "rag:coaching:" + hashlib.sha256(normalized.encode()).hexdigest()


async def get_cached(key: str) -> dict[str, Any] | None:
    value = await get_redis().get(key)
    if value is None:
        return None
    return json.loads(value)


async def set_cached(key: str, value: dict[str, Any], ttl_seconds: int = CACHE_TTL) -> None:
    await get_redis().setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))
