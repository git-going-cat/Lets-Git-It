"""Phase 1: API 연결 테스트 스크립트.

실행: python scripts/test_connections.py
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()


async def test_embedding():
    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    response = await client.embeddings.create(
        model="openai/text-embedding-3-small",
        input="git rebase 사용법",
    )
    dim = len(response.data[0].embedding)
    print(f"[OK] Embedding: {dim}차원")


async def test_llm():
    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    response = await client.chat.completions.create(
        model="openai/gpt-4o-mini",
        messages=[{"role": "user", "content": "ping"}],
        max_tokens=5,
    )
    print(f"[OK] LLM: {response.choices[0].message.content!r}")


async def test_pinecone():
    from pinecone import Pinecone
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    index = pc.Index(
        name=os.environ["PINECONE_INDEX_NAME"],
        host=os.environ["PINECONE_HOST"],
    )
    stats = index.describe_index_stats()
    print(f"[OK] Pinecone: {stats.total_vector_count}개 벡터")


async def test_redis():
    import redis.asyncio as aioredis
    r = aioredis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))
    await r.ping()
    await r.aclose()
    print("[OK] Redis: 연결 성공")


async def main():
    print("=== API 연결 테스트 ===")
    tests = [
        ("OpenRouter Embedding", test_embedding),
        ("OpenRouter LLM", test_llm),
        ("Pinecone", test_pinecone),
        ("Redis", test_redis),
    ]
    for name, fn in tests:
        try:
            await fn()
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
    print("=== 완료 ===")


if __name__ == "__main__":
    asyncio.run(main())
