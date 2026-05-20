from typing import Any

from fastapi import HTTPException
from loguru import logger

from app.llm import call_chat_json
from app.prompts import COACHING_SYSTEM_PROMPT
from app.rag.cache import get_cached, make_coaching_cache_key, set_cached
from app.rag.context import build_context
from app.rag.search import search


async def generate_coaching(
    user_input: str,
    correct_command: str,
    card_id: str,
    score: int,
) -> dict[str, Any]:
    cache_key = make_coaching_cache_key(card_id, user_input)
    cached = await get_cached(cache_key)
    if cached:
        # 캐시 히트는 LLM 호출이 없으므로 latency는 사실상 0.
        # 저장 시점의 원본 latency를 그대로 반환하면 모니터링이 오해함.
        return {**cached, "latencyMs": 0, "cached": True}

    # 두 명령어 concat — 의도적으로 단순. 명령어 토큰이 함께 들어가야
    # 차이점 청크가 잡힐 확률이 올라감. 자연어 쿼리 생성은 V2.
    query = f"{user_input} {correct_command}"
    chunks = await search(query, top_k=3)

    context = build_context(chunks) if chunks else "관련 자료 없음"
    messages = [
        {"role": "system", "content": COACHING_SYSTEM_PROMPT.format(context=context)},
        {
            "role": "user",
            "content": f"사용자 입력: {user_input}\n정답 명령어: {correct_command}\n점수: {score}",
        },
    ]

    try:
        text, model_used, latency_ms = await call_chat_json(messages, max_tokens=300)
    except Exception:
        logger.exception("Coaching LLM call failed")
        raise HTTPException(status_code=503, detail="코칭 생성 중 오류가 발생했습니다.")

    source_chunks = [
        {"chapter": c["chapter"], "section": c["section"], "text": c["text"]}
        for c in chunks
    ]
    result = {
        "coaching": text,
        "modelUsed": model_used,
        "latencyMs": latency_ms,
        "sourceChunks": source_chunks,
        "cached": False,
    }

    if text:
        # latencyMs는 캐시에서 의미 없음 → 저장 dict에 포함하지 않음.
        try:
            await set_cached(cache_key, {
                "coaching": text,
                "modelUsed": model_used,
                "sourceChunks": source_chunks,
            })
        except Exception as e:
            logger.warning(f"Coaching cache write failed: {e}")

    return result
