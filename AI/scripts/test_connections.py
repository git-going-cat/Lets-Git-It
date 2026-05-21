"""API 연결 테스트 스크립트.

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


async def test_llm_fallback():
    from openai import AsyncOpenAI
    from app.llm import PREFERRED_MODELS
    client = AsyncOpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
    )
    response = await client.chat.completions.create(
        model=PREFERRED_MODELS[0],
        messages=[{"role": "user", "content": "ping"}],
        max_tokens=5,
        extra_body={"models": PREFERRED_MODELS},
    )
    print(f"[OK] LLM fallback: model={response.model!r}, reply={response.choices[0].message.content!r}")


async def test_redis():
    import redis.asyncio as aioredis
    r = aioredis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))
    await r.ping()
    await r.aclose()
    print("[OK] Redis: 연결 성공")


async def main():
    print("=== API 연결 테스트 ===")
    import sys
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

    tests = [
        ("OpenRouter Embedding", test_embedding),
        ("OpenRouter LLM (fallback ladder)", test_llm_fallback),
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
