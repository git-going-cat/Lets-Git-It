import asyncio
import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pinecone import Pinecone

load_dotenv()

_embed_client: AsyncOpenAI | None = None
_index = None


def _get_embed_client() -> AsyncOpenAI:
    global _embed_client
    if _embed_client is None:
        _embed_client = AsyncOpenAI(
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    return _embed_client


def _get_index():
    global _index
    if _index is None:
        pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _index = pc.Index(
            name=os.environ["PINECONE_INDEX_NAME"],
            host=os.environ["PINECONE_HOST"],
        )
    return _index


async def search(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    client = _get_embed_client()
    resp = await client.embeddings.create(
        model="openai/text-embedding-3-small",
        input=query,
    )
    vector = resp.data[0].embedding

    index = _get_index()
    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        None,
        lambda: index.query(vector=vector, top_k=top_k, include_metadata=True),
    )

    return [
        {
            "chapter": m.metadata.get("chapter", ""),
            "section": m.metadata.get("section", ""),
            "text": m.metadata.get("text", ""),
            "score": m.score,
            "source": m.metadata.get("source", ""),
        }
        for m in results.matches
    ]
