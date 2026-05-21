import hashlib
import json
from typing import Any

from app.redis_client import get_redis

CACHE_TTL = 604800  # 7일


def _norm(s: str) -> str:
    """중복 공백 제거. 대소문자는 보존 — HEAD/head, README.md/readme.md 등 ref/path가
    Git에서 의미상 다를 수 있어 소문자화하지 않음."""
    return " ".join(s.split())


def make_cache_key(query: str) -> str:
    return "rag:cache:" + hashlib.sha256(_norm(query).encode()).hexdigest()


def make_coaching_cache_key(user_input: str, correct_command: str) -> str:
    normalized = f"{_norm(user_input)}:{_norm(correct_command)}"
    return "rag:coaching:" + hashlib.sha256(normalized.encode()).hexdigest()


def make_command_cache_key(correct_command: str) -> str:
    """correctCommand 단위 캐시 — 입력값 무관하게 같은 정답 명령어면 재사용."""
    return "rag:command:" + hashlib.sha256(_norm(correct_command).encode()).hexdigest()


async def get_cached(key: str) -> dict[str, Any] | None:
    value = await get_redis().get(key)
    if value is None:
        return None
    return json.loads(value)


async def set_cached(key: str, value: dict[str, Any], ttl_seconds: int = CACHE_TTL) -> None:
    await get_redis().setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))
