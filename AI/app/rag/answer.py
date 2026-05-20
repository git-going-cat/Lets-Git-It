import json
import os
from collections.abc import AsyncGenerator
from typing import Any

from dotenv import load_dotenv
from loguru import logger
from openai import AsyncOpenAI

from app.prompts import SYSTEM_PROMPT
from app.rag.cache import set_cached

load_dotenv()

_llm_client: AsyncOpenAI | None = None


def _get_llm_client() -> AsyncOpenAI:
    global _llm_client
    if _llm_client is None:
        _llm_client = AsyncOpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    return _llm_client


def _build_context(chunks: list[dict[str, Any]]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(f"[{i}] {c['chapter']} > {c['section']}\n{c['text']}")
    return "\n\n---\n\n".join(parts)


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
        context = _build_context(chunks)
        stream = await _get_llm_client().chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
                {"role": "user", "content": query},
            ],
            stream=True,
            max_tokens=1024,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
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
