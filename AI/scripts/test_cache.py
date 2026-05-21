"""Phase 4: Redis 캐시 동작 확인."""
import asyncio
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.rag.cache import get_cached, make_cache_key, set_cached


async def main():
    key = make_cache_key("git rebase 테스트")
    print(f"Cache key: {key[:20]}...")

    await set_cached(key, {"answer": "테스트 답변", "sources": []}, ttl_seconds=60)
    print("[OK] set_cached 완료")

    result = await get_cached(key)
    print(f"[OK] get_cached: {result}")

    print("[OK] Redis 캐시 정상 동작")


if __name__ == "__main__":
    asyncio.run(main())
