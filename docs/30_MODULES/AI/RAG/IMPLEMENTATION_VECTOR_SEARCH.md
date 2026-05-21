# 벡터 검색 런타임 구현

### Background / Context

**Pro Git 한국어판(718청크) + Git 공식 문서 한국어 번역본(1383청크) = 총 2101청크**를 인메모리 numpy 배열로 관리. FastAPI 시작 시 `data/embeddings.npy`를 한 번 로드하고, 사용자 질문이 들어오면 query를 임베딩해서 코사인 유사도로 가장 가까운 K개를 반환한다.

Git 공식 문서 한국어 번역본은 `scripts/translate_git_docs.py`로 LLM 번역 후 `data/git-docs-ko/`에 커밋. 재번역 없이 재현 가능. 청크 메타데이터에 `source_type: 'progit' | 'git-docs-ko'` 포함.

### Decision

**인메모리 numpy + L2 정규화 dot product**

```
[시작 시 1회]
data/chunks.json + data/embeddings.npy → 모듈 전역 변수 _chunks, _embeddings

[요청마다]
query 문자열
  → OpenRouter text-embedding-3-small → 1536차원 벡터
  → L2 정규화
  → _embeddings @ query_vec (dot product = cosine similarity)
  → argsort → top_k 인덱스
  → [{chapter, section, text, source, score}] 반환
```

`app/rag/vector_store.py`:
```python
def load_index() -> None:
    global _chunks, _embeddings
    _chunks = json.loads(chunks_path.read_text())
    _embeddings = np.load(str(embeddings_path))  # shape (N, 1536), L2 정규화됨

def cosine_search(query_vec, top_k=5) -> list[dict]:
    q = np.array(query_vec, dtype=np.float32)
    q = q / np.linalg.norm(q)           # query도 L2 정규화
    scores = _embeddings @ q             # dot product = cosine sim (정규화 후)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [...]
```

`app/rag/search.py`:
```python
async def search(query: str, top_k: int = 5) -> list[dict]:
    resp = await _get_embed_client().embeddings.create(
        model="openai/text-embedding-3-small",
        input=query,
    )
    return cosine_search(resp.data[0].embedding, top_k=top_k)
```

### Why

#### Pinecone → 인메모리로 전환한 이유

| 항목 | Pinecone | 인메모리 numpy |
|---|---|---|
| 검색 latency | 100~200ms (네트워크) | 1~10ms |
| 외부 의존 | Pinecone SaaS + API key | 없음 |
| 운영 복잡도 | FastAPI + Redis + Pinecone | FastAPI + Redis |
| 청크 수 | 관계없음 | 2101개 × 1536 × 4 byte ≈ 12.9MB (무시 가능) |
| 월 비용 | 무료 티어 내 ~$0 | $0 |
| 확장성 | 수백만 청크 가능 | ~수만 청크까지 실용적 |

Pro Git은 한 번 정해진 책이라 청크가 폭발할 일이 없고, 3.5MB짜리 배열에 Pinecone의 장점이 없다.

#### L2 정규화를 인덱싱 시점에 미리 수행

`scripts/ingest.py`에서 임베딩 후 정규화:
```python
arr = np.array(all_embeddings, dtype=np.float32)
norms = np.linalg.norm(arr, axis=1, keepdims=True)
arr = arr / norms
np.save(str(EMBEDDINGS_FILE), arr)
```

런타임에 매 요청마다 정규화하면 같은 배열에 반복 계산. 미리 정규화해두면 런타임은 query만 정규화하면 됨.

L2 정규화된 벡터끼리의 dot product = 코사인 유사도 ([-1, 1], 1에 가까울수록 유사).

#### `top_k` 결정

| top_k | 용도 | 컨텍스트 토큰 (avg 559×K) |
|---|---|---|
| **3** | `/coaching` | ~1,700 |
| **5** | `/ask` | ~2,800 |

코칭은 "이 명령어가 왜 다른가"라는 좁은 질문이라 3개로 충분. `/ask`는 일반 질문이라 5개가 균형점.

#### 임베딩은 동일 모델 필수

인덱스의 청크 벡터: `text-embedding-3-small`로 생성됨.
런타임 query 벡터도 반드시 같은 모델로 생성해야 비교 가능 (다른 모델은 벡터 공간이 다름).

### 인덱스 빌드

`scripts/ingest.py --index` 실행:
```bash
python scripts/ingest.py --chunk   # chunks.json 생성 (청크 없으면 먼저)
python scripts/ingest.py --index   # embeddings.npy 생성
```

산출물: `data/embeddings.npy` (gitignore됨). Docker 이미지 빌드 전 반드시 생성 필요.

### 검색 품질 평가 결과

`scripts/eval_rag.py` 13개 샘플 쿼리 (자연어 8 + 명령어 5):

**자연어 질의 (progit 청크 주로 반환)**

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

**명령어 질의 (git-docs-ko 청크 주로 반환)**

| 쿼리 | source_type 분포 |
|---|---|
| git restore --staged | git-docs-ko 우세 |
| git reset --soft HEAD~1 | git-docs-ko 우세 |
| git cherry-pick 충돌 해결 | git-docs-ko 우세 |
| git rebase -i squash | git-docs-ko 우세 |
| git switch -c 새 브랜치 | git-docs-ko 우세 |

이중 코퍼스 도입 전에는 `git restore --staged` 질의에서 Bazaar/stash 무관 청크가 반환됐지만, git-docs-ko 통합 후 `git-restore` 청크가 top-K에 포함됨.

### Caution

- **`data/embeddings.npy`는 gitignore 처리**: CI 빌드나 신규 환경 셋업 시 `ingest.py --index` 실행 필요. 빠지면 FastAPI 시작 시 FileNotFoundError.
- **임베딩 모델 변경 시 재생성**: 모델을 바꾸면 차원이 달라질 수 있으므로 `embeddings.npy` 삭제 후 재생성 필요.
- **검색 결과 중복**: 같은 섹션이 top 1, 2 모두 차지하는 경우 있음 (슬라이딩 윈도우 청킹). 향후 `(chapter, section)` 기준 dedup 고려 가능.
- **git-docs-ko 청크 우세**: 1383 vs 718로 git-docs-ko가 더 많아 명령어 질의에서 git-docs-ko 청크가 주로 반환됨. 자연어 질의는 여전히 progit이 상위.

### Test Plan

- `python scripts/test_search.py` 실행 → "git rebase 사용법"으로 검색
- top 3 결과의 chapter/section/score/source_type 출력 확인
- 점수가 0.5 이상인지 확인 (관련성)
- `python scripts/eval_rag.py`로 13개 쿼리 일괄 평가
- 명령어 질의에서 `source_type: git-docs-ko` 비율 확인
