import json
from typing import Any

from loguru import logger

from app.git_validator import is_git_like
from app.llm import call_chat_json
from app.prompts import COACHING_PERSONAL_PROMPT, COACHING_SYSTEM_PROMPT
from app.rag.cache import get_cached, make_coaching_cache_key, make_command_cache_key, set_cached
from app.rag.context import build_context
from app.rag.search import search


async def generate_coaching(
    user_input: str,
    correct_command: str,
    card_id: str,
    score: int,
    base: int,
    must: int,
    bonus: int,
    explanation: str | None = None,
) -> dict[str, Any]:
    cache_key = make_coaching_cache_key(card_id, user_input)
    cached = await get_cached(cache_key)
    if cached:
        return {**cached, "latencyMs": 0, "cached": True}

    # 두 명령어 concat — 의도적으로 단순. 명령어 토큰이 함께 들어가야
    # 차이점 청크가 잡힐 확률이 올라감. 자연어 쿼리 생성은 V2.
    query = f"{user_input} {correct_command}"
    chunks = await search(query, top_k=3)

    context = build_context(chunks) if chunks else "관련 자료 없음"
    explanation_block = explanation or "(제공되지 않음)"
    user_content = (
        f"사용자 입력: {user_input}\n"
        f"정답 예시: {correct_command}\n"
        f"채점 결과: base={base}/40, must={must}/40, bonus={bonus}/20 (총 {score}/100)\n"
        f"카드 해설 (응답에 인용 금지, 내부 참고만): {explanation_block}"
    )
    messages = [
        {"role": "system", "content": COACHING_SYSTEM_PROMPT.format(context=context)},
        {"role": "user", "content": user_content},
    ]

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
