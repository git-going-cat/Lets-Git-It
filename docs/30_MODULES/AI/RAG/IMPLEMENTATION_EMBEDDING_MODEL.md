# 임베딩 모델 선택

### Background / Context

Pinecone 인덱스 `lgi-progit-ko`는 dim=1536, metric=cosine으로 이미 생성되어 있다. 문서 청크와 사용자 질문을 벡터로 변환할 임베딩 모델이 필요했으며, 기존 인덱스 재생성 없이 사용 가능한 1536차원 모델이 필요했다.

### Decision

**OpenRouter 경유 `openai/text-embedding-3-small`** (1536차원)

### Why

| 옵션 | 차원 | 한국어 품질 | 비용 (Pro Git 1회 인덱싱) | 비고 |
|---|---|---|---|---|
| **OpenRouter → text-embedding-3-small** | 1536 | 좋음 | ~$0.02 | 기존 인덱스 그대로 사용 가능 |
| Voyage AI voyage-3-lite | 512 | 매우 좋음 | ~$0.01 | 인덱스 재생성 필요 |
| BGE-M3 / multilingual-e5 (로컬) | 1024 | 매우 좋음 | $0 | EC2 메모리 부담, 이미지 크기 증가 |
| Cohere embed-multilingual-v3 | 1024 | 매우 좋음 | ~$0.05 | 인덱스 재생성 필요 |

1. 이미 Pinecone 인덱스가 1536차원으로 생성됨 → 재생성 비용·시간 없음
2. OpenRouter 계정이 이미 있고 LLM도 OpenRouter 사용 → API 키 단일화
3. text-embedding-3-small의 한국어 지원은 Pro Git 수준(기술 문서)에서 충분
4. 인덱싱 비용 ~$0.02 (일회성), 쿼리당 임베딩 비용 무시 가능 수준

### Caution

- 임베딩 모델 변경 시 Pinecone 인덱스 전체 재생성 필요 (벡터 차원 고정)
- OpenRouter 월 $8 한도에 임베딩 비용도 포함됨 (인덱싱 일회성이라 실질 영향 없음)

### Test Plan

- `scripts/test_connections.py` 실행 시 `[OK] Embedding: 1536차원` 확인
- 인덱싱 완료 후 Pinecone 대시보드에서 벡터 수 확인
