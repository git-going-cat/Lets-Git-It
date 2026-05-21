"""RAG 품질 평가 - 다양한 질문 유형으로 응답 확인."""
import asyncio
import sys

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.rag.search import search
from app.rag.answer import stream_answer
from app.rag.vector_store import load_index

load_index()

QUERIES = [
    # 자연어 질의 (progit 기반)
    "git rebase와 git merge의 차이점",
    "git stash 사용법",
    "git cherry-pick이 뭐야",
    "브랜치를 원격에 푸시하는 방법",
    "충돌 해결하는 방법",
    "git bisect로 버그 찾는 방법",
    "git reflog 언제 쓰는지",
    "서브모듈 추가하는 방법",
    # 명령어 중심 질의 (git-docs-ko 기반)
    "git restore --staged",
    "git reset --soft HEAD~1",
    "git cherry-pick 충돌 해결",
    "git rebase -i squash",
    "git switch -c 새 브랜치",
]

async def eval_query(query: str) -> None:
    print(f"\n{'='*60}")
    print(f"Q: {query}")
    print("-" * 60)

    chunks = await search(query, top_k=3)
    if not chunks:
        print("[FAIL] 검색 결과 없음")
        return

    top_score = chunks[0]["score"]
    source_types = [c.get("source_type", "unknown") for c in chunks]
    type_dist = {t: source_types.count(t) for t in set(source_types)}
    print(
        f"Top 유사도: {top_score:.3f} | "
        f"챕터: {chunks[0]['chapter']} > {chunks[0]['section']} | "
        f"출처: {type_dist}"
    )

    import json
    answer = ""
    async for event in stream_answer(query, chunks):
        if "event: token" in event and "data:" in event:
            data_part = event.split("data:", 1)[1].strip()
            answer += json.loads(data_part).get("text", "")

    print(f"응답 길이: {len(answer)}자")
    print(f"응답 미리보기: {answer[:200]}...")
    print(f"품질 판단: {'✓ 관련성 높음' if top_score > 0.55 else '△ 관련성 낮음 - 출처 부족 가능성'}")


async def main():
    print("=== RAG 품질 평가 ===")
    for q in QUERIES:
        await eval_query(q)
    print(f"\n{'='*60}")
    print("평가 완료")

if __name__ == "__main__":
    asyncio.run(main())
