# FE WebSocket 구현 가이드

## 1. 개요

FE WebSocket 레이어는 멀티 모드 전용 통신 계층이다.

- 싱글 모드는 WebSocket을 사용하지 않고 REST API만 사용한다.
- WebSocket API 원본 명세는 `docs/10_ARCHITECTURE/WEBSOCKET_API.md`를 기준으로 하되, FE 구현 규칙은 이 문서를 우선한다.
- 타임어택 관련 WebSocket 구현은 현재 FE WebSocket 레이어 범위에서 제외한다.

## 2. 기술 스택

| 분류         | 라이브러리         | 버전                 |
| ------------ | ------------------ | -------------------- |
| STOMP Client | `@stomp/stompjs`   | `^7.3.0`             |
| 런타임 검증  | `zod`              | `^4.3.6`             |
| 상태 관리    | `zustand`, `jotai` | `^5.0.12`, `^2.19.1` |

`VITE_WS_URL`에 WebSocket 엔드포인트 전체 URL을 설정한다.
`.env` 파일에 직접 값을 채워 사용하며, git에 커밋하지 않는다.

## 3. 연결 생명주기

| 시점                  | 처리                                                      |
| --------------------- | --------------------------------------------------------- |
| 방 입장 확정          | `socketManager.connect(token)` 호출                       |
| 방 구독 준비          | `socketManager.subscribe(destination, handler, key)` 호출 |
| 방 완전 이탈          | `socketManager.disconnect()` 호출                         |
| 홈 이동               | `socketManager.disconnect()` 호출                         |
| 강제 종료 이벤트 수신 | 즉시 `socketManager.disconnect()` 호출                    |

구독은 연결 전에도 호출할 수 있다. 연결 전 구독은 `pendingSubscriptions`에 적재되고, STOMP 연결 성공 후 자동으로 등록된다.

## 4. 인증 방식

- 토큰은 `connect(token: string, onConnect?: () => void)` 호출 시점에 외부에서 주입한다.
- `SocketManager`는 `useAuthStore`를 직접 import하지 않는다.
- auth store에서 accessToken을 꺼내는 책임은 feature hook이 가진다.
- 토큰은 STOMP `connectHeaders.Authorization = "Bearer {token}"`으로 전달한다.
- 쿼리스트링 토큰 전달은 access log 노출 위험 때문에 금지한다.

## 5. 구독 경로 전체 목록

| 도메인       | 이벤트 범위          | 구독 경로                           | 구독 시점                           |
| ------------ | -------------------- | ----------------------------------- | ----------------------------------- |
| 공통(대기실) | 방 전체 브로드캐스트 | `/topic/room/{roomId}`              | 방 입장 시 즉시                     |
| 공통(대기실) | 개인 메시지          | `/user/queue/private`               | 방 입장 시 즉시                     |
| 기여도 뺏기  | 게임 이벤트          | `/topic/room/{roomId}/contribution` | 게임 시작 전 (start 발행 전에 먼저) |
| 협력         | 게임 이벤트          | `/topic/room/{roomId}/coop`         | 게임 시작 전 (start 발행 전에 먼저) |

## 6. 발행 경로 전체 목록

| 도메인       | type                    | 발행 경로                                  |
| ------------ | ----------------------- | ------------------------------------------ |
| 공통(대기실) | `READY_UPDATE`          | `/app/room/{roomId}/ready`                 |
| 공통(대기실) | `HOST_TRANSFER_REQUEST` | `/app/room/{roomId}/transfer-host`         |
| 공통(대기실) | `GAME_START`            | `/app/room/{roomId}/start`                 |
| 공통(대기실) | `CHAT`                  | `/app/room/{roomId}/chat`                  |
| 기여도 뺏기  | `CONTRIBUTION_INPUT`    | `/app/room/{roomId}/contribution/commands` |
| 협력         | `COOP_INPUT`            | `/app/room/{roomId}/coop/input`            |
| 협력         | `COOP_RESET`            | `/app/room/{roomId}/coop/reset`            |

## 7. 레이어 구조와 역할

| 레이어        | 위치                                   | 책임                                                  | 금지 사항                                         |
| ------------- | -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| SocketManager | `FE/src/core/socket/SocketManager.ts`  | 연결, 해제, 구독, 발행의 단일 진입점                  | 도메인 개념 포함 금지, `useAuthStore` import 금지 |
| Hook          | `FE/src/features/{domain}/hooks/`      | 토큰 주입, Zod 검증, store 업데이트, 화면 이벤트 연결 | 컴포넌트로 raw socket 로직 노출 금지              |
| Component     | `FE/src/features/{domain}/components/` | 렌더링과 사용자 입력 전달                             | `socketManager` 직접 접근 금지                    |

## 8. 패킷 처리 규칙

- 패킷 직렬화 형식은 JSON으로 고정한다.
- 수신 패킷은 `type` 필드를 기준으로 분기한다.
- 게임 중 WebSocket 패킷 검증은 Zod `.safeParse()`를 사용한다.
- 게임 중 `.parse()` 사용은 throw로 UI가 중단될 수 있으므로 금지한다.
- 검증 실패 시 `console.error`로 기록하고 해당 패킷은 폐기한다.
- 검증 실패는 게임 UI를 중단하지 않는다.

## 9. gameSessionId 처리

- 게임 시작 이후 수신되는 게임 패킷은 `gameSessionId`로 현재 세션과 일치하는지 확인한다.
- 현재 클라이언트가 보관 중인 `gameSessionId`와 다른 패킷은 폐기한다.
- 세션 불일치 패킷은 이전 게임, 재연결 경계, 지연 수신 가능성이 있으므로 UI 상태에 반영하지 않는다.
- 대기실 단계의 공통 패킷은 `roomId` 기준으로 처리한다.

## 10. serverTime / startAt 시간 동기화

서버 기준 절대 시간을 받아 클라이언트 렌더링 기준 시간을 보정한다.

```ts
const drift = serverTime - Date.now();
const adjustedNow = Date.now() + drift;
```

- `serverTime`은 서버의 현재 시각이다.
- `startAt`은 게임 시작 기준 시각이다.
- 렌더링 시 `adjustedNow - startAt`으로 이미 경과한 시간을 계산한다.
- 클라이언트 로컬 시간만으로 게임 시작 시점을 계산하지 않는다.

## 11. 재연결 처리

재연결 후 서버가 `ROOM_STATE`를 내려주면 `gameState` 기준으로 분기한다.

| gameState | 처리                          |
| --------- | ----------------------------- |
| `WAITING` | 대기실 상태 복원              |
| `RUNNING` | reconnect 미지원, 대기실 이동 |

- `FORCE_DISCONNECT` 수신 시 즉시 `socketManager.disconnect()`를 호출한다.
- 재연결 후 3초 내 `ROOM_STATE`를 받지 못하면 REST fallback으로 현재 방 상태를 조회한다.
- REST fallback도 실패하면 대기실 또는 홈으로 이동한다.

## 12. 중복 입력 방지

- 클라이언트가 발행하는 사용자 액션 패킷에는 `requestId`를 포함한다.
- `requestId`는 `crypto.randomUUID()`를 우선 사용한다.
- 동일 액션을 재시도할 때는 새 `requestId`를 발급한다.
- 서버는 같은 `requestId`를 중복 처리하지 않아야 한다.
- FE는 제출 버튼, Enter 입력, 재전송 로직에서 중복 발행을 막는다.

## 13. 에러 처리

공통 에러 응답 형식:

```json
{
  "type": "ERROR",
  "code": "ROOM_NOT_FOUND",
  "message": "존재하지 않는 방입니다."
}
```

- `type === "ERROR"` 패킷은 도메인 hook에서 공통 에러 핸들러로 전달한다.
- `onStompError`는 STOMP 프로토콜 레벨 오류를 기록한다.
- `onWebSocketClose`는 연결 종료를 기록하고 연결 상태를 disconnected로 본다.
- 인증 실패, 권한 오류, 방 삭제 등 복구 불가능한 오류는 구독 해제 후 대기실 또는 홈으로 이동한다.
- 일시적 네트워크 오류는 재연결 정책을 따른다.

## 14. Phaser 연동 규칙

- Phaser Scene과 React 상태는 직접 연결하지 않는다.
- Scene은 도메인 EventBus를 통해서만 WebSocket hook과 통신한다.
- Scene 안에서 React, Zustand, Jotai를 직접 import하지 않는다.
- WebSocket 수신 패킷은 feature hook에서 검증한 뒤 EventBus로 Scene에 전달한다.
- Scene에서 발생한 입력 이벤트도 EventBus를 통해 hook으로 전달하고, hook이 `socketManager.publish`를 호출한다.

## 15. 자주 하는 실수 (FAQ)

| 실수                                                          | 올바른 처리                                                |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| 잘못된 개인 구독 경로를 사용함                                | `/user/queue/private`를 구독한다.                          |
| `connect` 전에 `subscribe` 호출을 피하려고 복잡한 분기를 만듦 | 연결 전 구독은 pending queue로 안전하게 처리된다.          |
| 미연결 상태에서 `publish` 호출                                | `socketManager.connected` 확인 후 발행한다.                |
| `SocketManager`에서 `useAuthStore` import                     | feature hook에서 token을 꺼내 `connect(token)`에 주입한다. |
| 컴포넌트에서 `socketManager` 직접 호출                        | feature hook을 만들고 컴포넌트는 hook API만 사용한다.      |
| 게임 중 `.parse()`로 패킷 검증                                | `.safeParse()` 후 실패 시 로그만 남기고 폐기한다.          |
