import json
from typing import Any

from loguru import logger

from app.git_validator import is_git_like
from app.llm import call_chat_json
from app.prompts import COACHING_PERSONAL_PROMPT, COACHING_SYSTEM_PROMPT
from app.rag.cache import get_cached, make_coaching_cache_key, make_command_cache_key, set_cached
from app.rag.context import build_context
from app.rag.search import search


async def generate_coaching(user_input: str, correct_command: str) -> dict[str, Any]:
    if is_git_like(user_input):
        # 정상 git 명령어 입력 — userInput 기준 개인화 코칭
        cache_key = make_coaching_cache_key(user_input, correct_command)
        prompt = COACHING_PERSONAL_PROMPT
        query = f"{user_input} {correct_command}"
        user_msg = f"사용자 입력: {user_input}\n정답 명령어: {correct_command}"
    else:
        # edge case (한글/영어 무관 입력, 자연어) — correctCommand 설명
        cache_key = make_command_cache_key(correct_command)
        prompt = COACHING_SYSTEM_PROMPT
        query = correct_command
        user_msg = f"명령어: {correct_command}"

    cached = await get_cached(cache_key)
    if cached:
        return {**cached, "latencyMs": 0, "cached": True}

    try:
        chunks = await search(query, top_k=3)
        context = build_context(chunks) if chunks else "관련 자료 없음"
        messages = [
            {"role": "system", "content": prompt.format(context=context)},
            {"role": "user", "content": user_msg},
        ]
        raw, model_used, latency_ms = await call_chat_json(messages, max_tokens=300, json_mode=True)
        try:
            parsed = json.loads(raw).get("coaching")
            text = parsed if isinstance(parsed, str) and parsed else raw
        except (json.JSONDecodeError, AttributeError):
            text = raw
        if not text:
            raise ValueError("empty coaching from LLM")
    except Exception:
        # 운영 시 fallback 비율을 트래킹하려면 'coaching.fallback' 라벨로 grep/메트릭화
        logger.exception("coaching.fallback — returning correctCommand")
        return {
            "coaching": f"정답 명령어: `{correct_command}`",
            "modelUsed": "fallback",
            "latencyMs": 0,
            "sourceChunks": [],
            "cached": False,
        }

    source_chunks = [
        {"chapter": c["chapter"], "section": c["section"]}
        for c in chunks
    ]
    result = {
        "coaching": text,
        "modelUsed": model_used,
        "latencyMs": latency_ms,
        "sourceChunks": source_chunks,
        "cached": False,
    }

    try:
        await set_cached(cache_key, {
            "coaching": text,
            "modelUsed": model_used,
            "sourceChunks": source_chunks,
        })
    except Exception as e:
        logger.warning(f"Coaching cache write failed: {e}")

    return result
