import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.rag.vector_store import cosine_search

load_dotenv()

_embed_client: AsyncOpenAI | None = None


def _get_embed_client() -> AsyncOpenAI:
    global _embed_client
    if _embed_client is None:
        _embed_client = AsyncOpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    return _embed_client


async def search(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    resp = await _get_embed_client().embeddings.create(
        model="openai/text-embedding-3-small",
        input=query,
    )
    return cosine_search(resp.data[0].embedding, top_k=top_k)
