# SSE 스트리밍 응답 구현

### Background / Context

gpt-4o-mini로 RAG 답변 생성 시 전체 응답까지 4~8초 소요. 단일 응답(non-streaming)으로 구현하면 사용자가 빈 화면을 수 초간 대기해야 하는 UX 문제가 발생한다. 또한 SSE는 단방향이라 우리 use case(서버→클라이언트 토큰 흐름)에 정확히 맞는다.

### Decision

**SSE (Server-Sent Events)** 방식으로 LLM 답변 스트리밍

기술 선택:
- FastAPI `StreamingResponse` (built-in)
- OpenRouter streaming API (`stream=True`)
- `Content-Type: text/event-stream`

### SSE 이벤트 명세

| 이벤트 | 시점 | 횟수 | 데이터 |
|---|---|---|---|
| `sources` | 스트림 시작 직후 | 1회 | `[{chapter, section, source}, ...]` (검색 청크 5개의 메타데이터) |
| `token` | LLM 응답 중 | N회 | `{text: "조각"}` |
| `cached` | 캐시 히트 시 (token 대체) | 1회 | `{text: "전체 답변"}` |
| `error` | LLM 호출 실패 시 | 1회 | `{message: "오류 메시지"}` |
| `done` | 스트림 종료 (항상) | 1회 | `{cached: bool, error?: bool}` |

각 이벤트 형식:
```
event: <name>
data: <JSON>
<빈 줄>
```

빈 줄(`\n\n`)이 이벤트 구분자. 클라이언트는 빈 줄 단위로 파싱.

### 시나리오별 이벤트 순서

#### 1) 캐시 미스 (정상 LLM 호출)
```
event: sources
data: [{"chapter": "...", "section": "...", "source": "..."}, ...]

event: token
data: {"text": "git"}

event: token
data: {"text": " rebase는"}

... (N개 토큰)

event: done
data: {"cached": false, "error": false}
```

#### 2) 캐시 히트
```
event: sources
data: [...]

event: cached
data: {"text": "전체 답변 텍스트"}

event: done
data: {"cached": true}
```

#### 3) 검색 결과 0건
```
event: sources
data: []

event: token
data: {"text": "제공된 자료에서 해당 내용을 찾을 수 없습니다."}

event: done
data: {"cached": false}
```

#### 4) LLM 호출 실패
```
event: sources
data: [...]

event: error
data: {"message": "응답 생성 중 오류가 발생했습니다"}

event: done
data: {"cached": false, "error": true}
```

### Why

| 옵션 | 구현 난이도 | FE 연동 | 비고 |
|---|---|---|---|
| **SSE (StreamingResponse)** | 낮음 | `fetch` + ReadableStream | 단방향 스트림에 적합 |
| WebSocket | 높음 | WS 클라이언트 필요 | 양방향 필요 없는데 과함 |
| Polling | 낮음 | 구현 간단 | 서버 부하, 실시간성 떨어짐 |
| 단일 응답 | 최저 | 일반 fetch | 4~8초 블로킹 → UX 불량 |

1. RAG 응답은 단방향 서버→클라이언트 스트림 — WebSocket의 양방향 오버헤드 불필요
2. FastAPI `StreamingResponse` + OpenRouter streaming API로 구현 간단
3. TTFT(첫 토큰) ~1~2초 → 체감 응답 속도 대폭 개선

### FE 구현 가이드

`EventSource`는 GET만 지원하므로 POST에서는 **사용 불가**. `fetch` + `ReadableStream` 사용:

```javascript
const response = await fetch('/ai/ask', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: userInput})
});

if (!response.ok) {
    // 422, 429 처리
    const err = await response.json();
    return handleError(err.detail);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let answer = '';

while (true) {
    const {value, done} = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, {stream: true});

    // 빈 줄(\n\n)로 이벤트 분리
    const events = buffer.split('\n\n');
    buffer = events.pop(); // 마지막 미완성 조각은 다음 read까지 보존

    for (const ev of events) {
        if (!ev.trim()) continue;
        const eventLine = ev.split('\n').find(l => l.startsWith('event:'));
        const dataLine = ev.split('\n').find(l => l.startsWith('data:'));
        if (!eventLine || !dataLine) continue;

        const eventName = eventLine.slice(6).trim();
        const data = JSON.parse(dataLine.slice(5).trim());

        switch (eventName) {
            case 'sources':
                renderSources(data);
                break;
            case 'token':
                answer += data.text;
                renderAnswer(answer);
                break;
            case 'cached':
                answer = data.text;
                renderAnswer(answer);
                break;
            case 'error':
                showError(data.message);
                break;
            case 'done':
                hideLoadingIndicator();
                return; // 스트림 종료
        }
    }
}
```

### Caution

- **nginx 프록시 시 필수 설정**:
  ```nginx
  proxy_buffering off;     # 버퍼링 활성 시 스트리밍이 일괄 응답으로 변함
  proxy_cache off;
  proxy_read_timeout 60s;  # 기본 60초도 OK, LLM 4~8초보다 길게
  ```
- **FE에서 `EventSource`는 GET만 지원** → POST 요청에는 `fetch` + `ReadableStream` 사용 필요
- **캐시 적중 시 이벤트 타입이 다름** (`cached` vs `token`) → FE에서 두 경우 모두 처리해야 함
- **`event: done`은 항상 전송됨** (에러 시에도) — `done`을 받기 전까지는 스트림 미완료. 무한 대기 방지를 위해 finally로 보장 ([[IMPLEMENTATION_ERROR_HANDLING]])
- **JSON 파싱 실패 처리 권장**: 네트워크 중단 등으로 SSE 조각이 깨질 수 있음. try/catch 권장
- **Korean 한글 인코딩**: `json.dumps(ensure_ascii=False)`로 한글 그대로 전송. UTF-8 디코딩 필수

### Test Plan

- `POST /ask` 호출 시 `text/event-stream` Content-Type 응답 확인
- `event: sources` → `event: token` → `event: done` 순서 검증
- 캐시 적중 시 `event: cached` 단일 이벤트 확인
- LLM 실패 시뮬레이션 (API 키 임의 변조) → `event: error` + `event: done(error: true)` 확인
- 검색 0건 시 (mock) → `event: sources(빈 배열)` + 안내 token
- curl 테스트:
  ```bash
  curl -X POST http://localhost:8000/ask \
       -H "Content-Type: application/json" \
       -d '{"query": "git rebase"}' --no-buffer
  ```
