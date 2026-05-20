import os
import time
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

PREFERRED_MODELS = [
    "google/gemini-2.5-flash-lite",
    "google/gemini-3.1-flash-lite",
    "openai/gpt-4o-mini",
]

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    return _client


async def call_chat_json(
    messages: list[dict[str, str]],
    max_tokens: int = 512,
) -> tuple[str, str, int]:
    """Returns (text, model_used, latency_ms)."""
    start = time.monotonic()
    response = await _get_client().chat.completions.create(
        model=PREFERRED_MODELS[0],
        messages=messages,
        max_tokens=max_tokens,
        extra_body={"models": PREFERRED_MODELS},
    )
    latency_ms = int((time.monotonic() - start) * 1000)
    text = response.choices[0].message.content or ""
    return text, response.model, latency_ms


async def stream_chat(
    messages: list[dict[str, str]],
    max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """Yields text delta tokens."""
    stream = await _get_client().chat.completions.create(
        model=PREFERRED_MODELS[0],
        messages=messages,
        max_tokens=max_tokens,
        stream=True,
        extra_body={"models": PREFERRED_MODELS},
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
