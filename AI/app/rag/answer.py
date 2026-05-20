import json
from collections.abc import AsyncGenerator
from typing import Any

from loguru import logger

from app.llm import stream_chat
from app.prompts import SYSTEM_PROMPT
from app.rag.cache import set_cached
from app.rag.context import build_context


async def stream_answer(
    query: str,
    chunks: list[dict[str, Any]],
    cache_key: str | None = None,
) -> AsyncGenerator[str, None]:
    sources = [
        {"chapter": c["chapter"], "section": c["section"], "source": c["source"]}
        for c in chunks
    ]
    yield f"event: sources\ndata: {json.dumps(sources, ensure_ascii=False)}\n\n"

    full_answer = ""
    has_error = False
    try:
        context = build_context(chunks)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
            {"role": "user", "content": query},
        ]
        async for delta in stream_chat(messages):
            full_answer += delta
            yield f"event: token\ndata: {json.dumps({'text': delta}, ensure_ascii=False)}\n\n"
    except Exception:
        logger.exception("LLM streaming failed")
        has_error = True
        yield f"event: error\ndata: {json.dumps({'message': '응답 생성 중 오류가 발생했습니다'}, ensure_ascii=False)}\n\n"
    finally:
        if cache_key and full_answer and not has_error:
            try:
                await set_cached(cache_key, {"answer": full_answer, "sources": sources})
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")
        yield f"event: done\ndata: {json.dumps({'cached': False, 'error': has_error})}\n\n"
