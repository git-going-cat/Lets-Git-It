# 에러 처리 설계

### Background / Context

`/ask` 엔드포인트는 SSE 스트리밍 방식. 일반 REST와 다른 에러 처리 패턴 필요:

1. **스트림 시작 전 실패** (Pydantic 검증, rate limit) → 일반 HTTP 4xx 응답 가능
2. **스트림 시작 후 실패** (LLM 타임아웃, 네트워크 단절) → 이미 200 OK + `Content-Type: text/event-stream` 헤더 전송됨 → HTTP status 코드로 에러 알릴 수 없음 → SSE 이벤트로 알려야 함

또한 SSE는 클라이언트가 `event: done`을 받기 전까지 "스트림 진행 중"으로 인식. **done 이벤트 누락 = 클라이언트 무한 대기**라는 함정이 있다.

### Decision

**스트림 단계별 에러 분리 + try/finally로 done 보장**

#### 1) 스트림 시작 전 — HTTP 응답으로 처리

| 상황 | 코드 | 응답 |
|---|---|---|
| query 누락/빈 문자열/공백/500자 초과 | 422 | Pydantic validation error JSON |
| IP 일일 한도 초과 | 429 | `{"detail": "일일 요청 한도를 초과했습니다."}` |
| OpenRouter API 키 누락 (env 설정 오류) | 500 | FastAPI 기본 에러 |

`app/routers/ask.py`의 `field_validator`:
```python
@field_validator("query")
def validate_query(cls, v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("query는 비어있을 수 없습니다")
    if len(v) > 500:
        raise ValueError("query는 500자를 초과할 수 없습니다")
    return v
```

#### 2) 검색 결과 0건 — 명시적 "찾을 수 없음" 응답

LLM 호출하지 않고 즉시 응답 (비용 회피):

```python
if not chunks:
    async def not_found_stream():
        yield f"event: sources\ndata: []\n\n"
        yield f"event: token\ndata: {json.dumps({'text': NOT_FOUND_MSG}, ...)}\n\n"
        yield f"event: done\ndata: {json.dumps({'cached': False})}\n\n"
    return StreamingResponse(not_found_stream(), media_type="text/event-stream")
```

#### 3) 스트림 중 실패 — `event: error` + 항상 `event: done`

`app/rag/answer.py`의 `stream_answer`:

```python
async def stream_answer(query, chunks, cache_key=None):
    sources = [...]
    yield f"event: sources\ndata: {json.dumps(sources, ...)}\n\n"

    full_answer = ""
    has_error = False
    try:
        stream = await _get_llm_client().chat.completions.create(...)
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                full_answer += delta
                yield f"event: token\ndata: {json.dumps({'text': delta}, ...)}\n\n"
    except Exception:
        has_error = True
        yield f"event: error\ndata: {json.dumps({'message': '응답 생성 중 오류가 발생했습니다'}, ...)}\n\n"
    finally:
        if cache_key and full_answer and not has_error:
            try:
                await set_cached(cache_key, {"answer": full_answer, "sources": sources})
            except Exception:
                pass  # 캐시 실패는 클라이언트에 영향 주지 않음
        yield f"event: done\ndata: {json.dumps({'cached': False, 'error': has_error})}\n\n"
```

### Why

#### finally로 done 보장

이 코드를 try/finally 없이 짜면:
```python
async for chunk in stream:  # ← 여기서 OpenRouter 502 발생
    yield f"event: token\n..."
# 도달 못 함
yield f"event: done\n..."
```

LLM 호출 중 네트워크 끊김 / 타임아웃 시 `event: done` 미전송 → 프론트의 `EventSource` 또는 `ReadableStream` 리더가 "스트림이 아직 진행 중"으로 인식해서 **무한 대기**. 사용자는 화면 멈춤만 봄.

`finally` 블록은 예외 발생 시에도 실행되므로 done 이벤트가 항상 전송됨.

#### 부분 응답 캐시 금지

```python
if cache_key and full_answer and not has_error:
    await set_cached(...)
```

LLM이 중간에 끊기면 답변이 불완전. 이걸 캐싱하면 다음 동일 질문에 잘못된(잘린) 답변을 반환. `has_error` 체크로 방지.

#### 캐시 실패 → 응답엔 영향 없음

```python
try:
    await set_cached(...)
except Exception:
    pass
```

Redis 일시 장애로 SETEX 실패해도 사용자 입장에서는 답변을 받았음. 캐시 실패가 done 이벤트를 막지 않도록 격리.

#### 검색 결과 0건에 LLM 호출 안 함

빈 context로 LLM 호출하면 LLM이 학습된 일반 지식으로 추측 답변 → SYSTEM_PROMPT의 "자료에 없으면 찾을 수 없다고 답해" 규칙 위반 가능. 또한 무용한 토큰 비용 발생. 즉시 고정 메시지 반환이 정확하고 저렴.

### 클라이언트 측 에러 처리 가이드 (FE 팀)

SSE 응답 파싱 시 필수 처리:

```javascript
const response = await fetch('/ask', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query})
});

if (!response.ok) {
    // 422, 429 등 HTTP 에러
    const err = await response.json();
    return showError(err.detail);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let done = false;

while (!done) {
    const {value, done: streamDone} = await reader.read();
    if (streamDone) break;

    const chunk = decoder.decode(value);
    // event: sources / token / cached / error / done 파싱
    // event: error → 사용자에게 에러 표시
    // event: done → 스트림 종료, done=true
}
```

이벤트별 FE 처리:
- `sources`: 답변 옆 출처 표시용 메타데이터 저장
- `token`: 화면에 글자 추가 (typing 효과)
- `cached`: token 대신 전체 답변 한 번에 표시
- `error`: 에러 메시지 표시, 사용자에게 재시도 안내
- `done`: 로딩 인디케이터 제거, 입력창 활성화

### Caution

- **클라이언트 연결 중단 (사용자가 새로고침)**: FastAPI의 `StreamingResponse`는 client disconnect를 자동 감지하지 않음. async generator는 계속 실행되어 토큰 비용 발생. 향후 `request.is_disconnected()` 체크 추가 고려
- **OpenRouter 토큰 한도 초과**: 매우 긴 context (가능성 낮음)에서 발생 가능. 현재 `max_tokens=1024`로 출력은 제한했지만 입력은 무제한. 청크 5개 × 800 토큰 + 시스템 프롬프트 ≈ 4500 토큰으로 충분히 안전
- **`event: error` 이후 done의 `error: true`**: 클라이언트는 둘 다 처리해야 함. error 이벤트 한 번 + done의 error 플래그로 이중 시그널
- **HTTP 4xx는 스트림 시작 전에만**: 스트림 중에는 200 OK로 시작했으므로 HTTP status로 에러 신호 못 보냄. 반드시 `event: error`로 알려야 함
- **rate limit이 stream_answer 안에서 발생 안 함**: rate limit은 endpoint 시작 시 1회만 체크. 스트림 중에는 추가 호출 없으므로 도중에 limit 걸릴 일 없음

### Test Plan

- 빈 query: `curl -d '{"query": ""}'` → 422 + Pydantic error JSON
- 500자 초과: 422
- 공백만: 422
- 정상 쿼리: 정상 SSE 흐름 (sources → token... → done)
- OpenRouter API 키 환경변수 일시 변조 후 호출 → `event: error` + `event: done(error: true)` 확인
- Pinecone 검색 시 임의로 빈 결과 반환하도록 mock → "찾을 수 없음" 응답
- 같은 쿼리 2회 → 두 번째에 cached 이벤트
