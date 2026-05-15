# IMPLEMENTATION: 방 채팅 WebSocket

## Background / Context

멀티플레이 대기실에서 플레이어들이 실시간으로 채팅을 주고받아야 한다.  
채팅은 방 전체에 브로드캐스트되는 실시간 이벤트이므로 REST API가 아닌 WebSocket(STOMP)으로 구현한다.

기존에 `RoomMessage.java`가 빈 클래스로 존재했고, WebSocket 공통 인프라(인증 인터셉터, 에러 핸들러, 메시지 발송 유틸)는 이미 구축되어 있었다.  
채팅 로직 자체는 방 존재 확인 + 메시지 검증으로 단순하여 별도 서비스 분리 없이 `RoomService`에 통합했다.

## Decision

`RoomService.processChat()`에 채팅 로직을 추가하고, `RoomWebSocketController`에서 `@MessageMapping`으로 수신 후 `WebSocketMessageSender`로 브로드캐스트한다.

**메시지 흐름**:
1. 클라이언트 → `/app/room/{roomId}/chat` 발행
2. `RoomWebSocketController.chat()` 수신
3. `RoomServiceImpl.processChat()` — 방 존재 확인, 메시지 검증
4. `WebSocketMessageSender.send("/topic/room/{roomId}", response)` — 전체 브로드캐스트

**playerId 처리**: V3 명세에 따라 Request body에서 `playerId`를 제거하고, CONNECT 시점에 JWT로 등록된 `StompPrincipal`에서 추출한다.  
`principal.getName()` = memberId(UUID 문자열).

**에러 처리**: `BusinessException` throw 시 기존 `WebSocketExceptionHandler`가 자동으로 `/user/queue/private`로 에러 응답을 전송한다. 별도 try-catch 불필요.

배제한 대안:
- **별도 `RoomChatService` 분리**: 로직이 검증 2줄 수준이라 과분한 분리. 방 도메인 내 사안이므로 `RoomService`에 통합.
- **`@SendTo("/topic/room/{roomId}")` 반환값 방식**: `roomId`가 동적 경로 변수이므로 `@SendTo`로는 동적 경로 대응이 불가. `WebSocketMessageSender.send()` 직접 호출 방식 선택.

## Why

| 항목 | 선택 | 이유 |
|------|------|------|
| 서비스 위치 | RoomService에 통합 | 채팅도 방 내부 도메인 행위, 로직 단순 |
| playerId 출처 | Principal | V3 명세 + JWT 인증 신뢰성 보장 |
| 브로드캐스트 방식 | `WebSocketMessageSender.send()` | 동적 roomId 경로 대응 |
| 에러 처리 | 기존 WebSocketExceptionHandler 위임 | 공통 인프라 재사용, 중복 코드 제거 |

## Caution

- **`sentAt`은 서버 기준 시각**: `System.currentTimeMillis()` 사용. 클라이언트 시계와 오차가 있을 수 있으나 채팅 타임스탬프 용도로 충분.
- **닉네임 검증 없음**: `nickname`은 클라이언트가 보낸 값을 그대로 신뢰해서 전달. 닉네임 위변조 방지가 필요하면 Redis에서 실제 닉네임을 조회하는 방식으로 변경 필요.
- **방 멤버 여부 미검증**: V3 명세의 에러 코드에 `PLAYER_NOT_IN_ROOM`이 없으므로 미구현. 방 입장 API 완성 후 필요 시 추가.
- **메시지 영속화 없음**: 채팅 메시지는 Redis나 DB에 저장하지 않음. 재접속 시 이전 채팅 복원 불가.

## Test Plan

- 유효한 JWT로 CONNECT → `/topic/room/{roomId}` 구독 → 채팅 전송 시 `CHAT_RESPONSE`가 구독자 전체에게 전달되는지 확인
- `message`가 빈 문자열(`""`)이면 `/user/queue/private`에 `MESSAGE_EMPTY` 에러 수신 확인
- `message`가 공백만 있는 경우(`"   "`)도 `MESSAGE_EMPTY` 에러 수신 확인
- `message`가 151자 이상이면 `MESSAGE_TOO_LONG` 에러 수신 확인
- 존재하지 않는 roomId로 전송 시 `ROOM_NOT_FOUND` 에러 수신 확인
- 응답의 `playerId`가 JWT의 memberId와 일치하는지 확인 (닉네임 위변조와 무관하게 서버 식별값 사용)

---

## Troubleshooting

### 채팅 닉네임 위장 가능 (MR 리뷰 수정 — 2026-05-15)

**현상**: `ChatResponse`에서 `nickname`을 `request.nickname()` (클라이언트 요청값)으로 채워 전송하고 있었다.
클라이언트가 임의의 닉네임을 채워 보내면 다른 사람 이름으로 채팅이 가능했다.

**원인**: Caution 섹션에 "위변조 방지가 필요하면 Redis에서 실제 닉네임 조회" 로 명시했으나 미구현 상태였다.

**수정**: `memberService.getNicknameById(memberId)`로 서버 기준 닉네임을 조회하도록 변경.
`ChatRequest.nickname` 필드는 응답 생성에 더 이상 사용하지 않는다.

```java
// Before
return ChatResponse.of(memberId, request.nickname(), message);

// After
String nickname = memberService.getNicknameById(memberId);
return ChatResponse.of(memberId, nickname, message);
```

**참고**: `getNicknameById`는 DB 조회이므로 채팅마다 DB 호출이 발생한다.
트래픽 이슈 시 Redis 멤버 Hash의 `nickname` 필드를 직접 읽는 방식으로 최적화 가능.