# 벡터 검색 런타임 구현

### Background / Context

Phase 3에서 Pro Git 청크 589개를 Pinecone에 인덱싱 완료 ([[IMPLEMENTATION_EMBEDDING_MODEL]] 참고). 이제 사용자 질문이 들어오면 그 질문도 벡터로 변환해서, Pinecone에서 가장 유사한 청크 K개를 가져오는 런타임 코드가 필요하다.

요구사항:
- 비동기 (FastAPI 이벤트 루프 블로킹 금지)
- 매 요청마다 클라이언트 재생성 금지 (싱글톤)
- Pinecone Python SDK는 동기 → async 코드에서 호출 시 처리 필요

### Decision

**lazy init 싱글톤 + `run_in_executor`로 동기 SDK 비동기 wrap**

`app/rag/search.py` 구조:

```python
_embed_client: AsyncOpenAI | None = None
_index = None

def _get_embed_client() -> AsyncOpenAI:
    global _embed_client
    if _embed_client is None:
        _embed_client = AsyncOpenAI(api_key=..., base_url="https://openrouter.ai/api/v1")
    return _embed_client

def _get_index():
    global _index
    if _index is None:
        pc = Pinecone(api_key=...)
        _index = pc.Index(name=..., host=...)
    return _index

async def search(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    # 1) query → 1536차원 벡터 (async)
    resp = await _get_embed_client().embeddings.create(
        model="openai/text-embedding-3-small",
        input=query,
    )
    vector = resp.data[0].embedding

    # 2) Pinecone query (동기 SDK → 이벤트 루프 블록 방지)
    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        None,
        lambda: _get_index().query(vector=vector, top_k=top_k, include_metadata=True),
    )

    # 3) FastAPI 친화적 dict 리스트로 변환
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
```

### Why

#### 1) 임베딩은 query에도 동일 모델 사용

Pinecone에 저장된 청크 벡터들은 `text-embedding-3-small`로 생성됨. 검색하려면 **반드시 같은 모델로 query도 임베딩**해야 비교 가능 (다른 모델은 벡터 공간이 다름).

#### 2) `top_k = 5`

| top_k | 컨텍스트 토큰 (avg 559×K) | 답변 다양성 | 비용 |
|---|---|---|---|
| 3 | ~1,700 | 부족 가능 | 저렴 |
| **5** | **~2,800** | **충분** | **균형** |
| 10 | ~5,600 | 과하게 산만 | 비쌈 |

gpt-4o-mini 컨텍스트 한도는 128K로 여유 있음. K=5가 정확도/비용 균형점.

#### 3) lazy init 싱글톤

매 요청마다 `AsyncOpenAI()` / `Pinecone()` 생성하면 TCP 연결도 매번 새로 맺어 성능 저하. 모듈 레벨 변수에 한 번 생성해두고 재사용.

`load_dotenv()`를 모듈 import 시 실행하지만, 클라이언트 객체는 첫 호출 때 생성 → 테스트 시 환경변수 mock이 쉬워짐.

#### 4) `run_in_executor` for Pinecone 동기 SDK

Pinecone Python SDK 5.x는 동기 클라이언트. FastAPI async 핸들러에서 동기 블로킹 호출하면 **이벤트 루프 전체가 멈춤** (모든 동시 요청이 함께 대기).

해결책: `loop.run_in_executor(None, sync_call)` → 스레드 풀에서 실행, 이벤트 루프는 다른 요청 처리 계속.

대안: Pinecone 5.x의 `PineconeAsyncio` (있긴 함). 다만 호환성 검증이 더 필요해 현재는 검증된 동기 SDK + executor 패턴 사용.

### 검색 결과 메타데이터

Pinecone 인덱싱 시 각 벡터의 metadata에 다음 저장 (`scripts/ingest.py:382`):
```python
metadata = {
    "chapter": "Git 브랜치",
    "section": "Rebase 의 기초",
    "source": "book/03-git-branching/sections/rebasing.asc",
    "token_count": 559,
    "text": "본문 텍스트...",  # 검색 시 별도 조회 없이 바로 사용
}
```

`text`를 metadata에 넣은 이유: 검색 후 LLM에 컨텍스트로 넘기려면 본문이 필요한데, 별도 저장소에서 ID로 조회하는 단계를 줄여 latency 절감.

Pinecone metadata 크기 제한은 40KB/벡터. 청크는 최대 800 토큰 ≈ 3KB이므로 충분.

### 검색 품질 평가 결과

`scripts/eval_rag.py` 8개 샘플 쿼리:

| 쿼리 | Top score | 매칭 섹션 |
|---|---|---|
| git rebase와 merge 차이 | 0.628 | Git 브랜치 > Merge 의 기초 |
| git stash 사용법 | 0.708 | Git 도구 > Stash를 만드는 새로운 방법 |
| git cherry-pick | 0.590 | 분산 환경 > Rebase와 Cherry-Pick 워크플로 |
| 브랜치를 원격에 푸시하는 방법 | 0.435 | Git 브랜치 > 브랜치 이동하기 |
| 충돌 해결하는 방법 | 0.490 | Git 도구 > 충돌 파일 Checkout |
| git bisect로 버그 찾기 | 0.663 | Git 도구 > 이진 탐색 |
| git reflog 언제 쓰는지 | 0.624 | Git 도구 > RefLog로 가리키기 |
| 서브모듈 추가하는 방법 | 0.487 | Git 도구 > 서브모듈 시작하기 |

해석:
- **>0.6**: 매우 양호. 검색-쿼리 의미 일치도 높음
- **0.5~0.6**: 양호. 답변 가능
- **<0.5**: 낮은 신뢰도. 자연어 쿼리와 책의 기술 용어 사이 갭이 원인. 그러나 실제 응답은 대체로 양호 (LLM이 청크 내용으로 답변 가능)

**우리 서비스 입력은 자연어 질문이 아니라 명령어**(`git push origin main`)라서 실제 운영에서는 점수가 더 높게 나올 것으로 예상.

### Caution

- **싱글톤 = 프로세스 단위**: 워커 여러 개면 각 워커가 자기 클라이언트 보유. 메모리 ~수십 MB 추가. uvicorn `--workers N` 사용 시 인지 필요
- **Pinecone latency**: 한국→AWS us-east-1 round-trip 약 200~300ms. 빠른 응답이 필요하면 동일 리전 배포 또는 한국 리전 이전 고려
- **임베딩 모델 변경 시 인덱스 재생성**: `text-embedding-3-small`(1536) → 다른 모델은 차원이 다르면 Pinecone 인덱스 새로 생성해야 함 ([[IMPLEMENTATION_EMBEDDING_MODEL]] 참고)
- **검색 결과 중복**: 같은 섹션이 top 1, 2 모두 차지하는 경우 있음 (큰 섹션이 슬라이딩 윈도우로 여러 청크로 쪼개진 경우). 향후 `(chapter, section)` 기준 dedup 고려 가능

### Test Plan

- `scripts/test_search.py` 실행 → "git rebase 사용법"으로 검색
- top 3 결과의 chapter/section/score 출력 확인
- 점수가 0.5 이상인지 확인 (관련성)
- `scripts/eval_rag.py`로 8개 쿼리 일괄 평가
