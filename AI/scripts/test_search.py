"""벡터 검색 동작 확인."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.rag.vector_store import load_index
from app.rag.search import search

load_index()


async def main():
    query = "git rebase 사용법"
    print(f"Query: {query!r}\n")
    results = await search(query, top_k=3)
    for r in results:
        print(f"[{r['score']:.3f}] {r['chapter']} > {r['section']}")
        print(r["text"][:150])
        print()


if __name__ == "__main__":
    asyncio.run(main())
