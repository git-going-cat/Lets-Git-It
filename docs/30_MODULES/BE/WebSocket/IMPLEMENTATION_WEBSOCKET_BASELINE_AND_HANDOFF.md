# IMPLEMENTATION_WEBSOCKET_BASELINE_AND_HANDOFF

## Background / Context

멀티플레이어 게임의 WebSocket/STOMP 기능을 구현하기 전에, 먼저 공통적으로 재사용할 수 있는 WebSocket 기반 구조를 정리할 필요가 있었다.

이번 단계의 목표는 게임 모드별 비즈니스 로직을 바로 구현하는 것이 아니라, 아래 공통 인프라를 먼저 안정적으로 준비하는 것이었다.

- STOMP CONNECT 시 JWT 인증 처리
- 인증된 사용자를 WebSocket 세션 `Principal`로 등록
- 브로드캐스트 / 개인 메시지 전송 유틸 제공
- WebSocket 전용 에러 응답 처리
- disconnect 이벤트를 감지할 수 있는 진입점 마련

즉, 지금 구현은 "대기실/게임 로직 구현 전 단계의 WebSocket 공통 뼈대"에 해당한다.

참고 명세는 현재 [`docs/10_ARCHITECTURE/임시_WEBSOCKET_API.md`](/S14P31A304/docs/10_ARCHITECTURE/임시_WEBSOCKET_API.md:1)를 기준으로 삼고 있다.

## Decision

### 1. 공통 WebSocket 초기 구조를 전역 패키지에 배치

현재 공통 WebSocket 관련 클래스는 아래 위치에 둔다.

- [`WebSocketConfig.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/config/WebSocketConfig.java:1)
- [`WebSocketAuthChannelInterceptor.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/auth/WebSocketAuthChannelInterceptor.java:1)
- [`WebSocketPrincipalResolver.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/auth/WebSocketPrincipalResolver.java:1)
- [`StompPrincipal.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/auth/StompPrincipal.java:1)
- [`WebSocketMessageSender.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketMessageSender.java:1)
- [`WebSocketErrorResponse.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/dto/WebSocketErrorResponse.java:1)
- [`WebSocketExceptionHandler.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketExceptionHandler.java:1)
- [`WebSocketStompErrorHandler.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketStompErrorHandler.java:1)
- [`WebSocketEventListener.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketEventListener.java:1)

이 계층은 도메인별 방/게임 핸들러보다 아래에서 동작하는 공통 기반 레이어다.

### 2. CONNECT 인증과 이후 메시지 처리를 분리

인증은 `CONNECT` 시점에 한 번만 수행한다.

```text
CONNECT
→ Authorization 헤더 검증
→ JWT 해석
→ member 식별
→ StompPrincipal 등록
```

이후 `SEND`, `SUBSCRIBE` 요청에서는 이미 세션에 등록된 `Principal`을 사용한다.

### 3. WebSocket 세션 사용자 식별자는 memberId 기반으로 고정

현재 WebSocket 세션에는 `StompPrincipal`을 저장하고, `principal.getName()`은 `memberId`를 반환하도록 했다.

즉 이후 도메인 로직은 아래 전제로 작성하면 된다.

```text
Principal principal
→ principal.getName()
→ memberId
```

### 4. 메시지 전송 책임은 공통 sender로 분리

메시지 전송은 [`WebSocketMessageSender.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketMessageSender.java:1)로 분리했다.

- `send(String destination, Object payload)`
  - 브로드캐스트/도메인 destination 직접 전달
- `sendToUser(String memberId, Object payload)`
  - 특정 사용자 유니캐스트

이 sender는 DTO 구조를 알지 않고 "전송"만 담당한다.

### 5. WebSocket 에러는 HTTP와 분리된 포맷으로 처리

WebSocket 에러 응답은 현재 명세에 맞춰 아래 포맷으로 통일했다.

```json
{
  "type": "ERROR",
  "code": "ROOM_NOT_FOUND",
  "message": "존재하지 않는 방입니다."
}
```

이를 위해 [`WebSocketErrorResponse.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/dto/WebSocketErrorResponse.java:1), [`WebSocketExceptionHandler.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketExceptionHandler.java:1), [`WebSocketStompErrorHandler.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketStompErrorHandler.java:1)를 둔다.

### 6. disconnect는 아직 처리 완료가 아니라 진입점만 구현

[`WebSocketEventListener.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketEventListener.java:1)는 `SessionDisconnectEvent`를 수신하는 진입점만 구현된 상태다.

현재는 아래만 수행한다.

- 인증된 사용자의 disconnect 로그 기록
- `sessionId`, `memberId`, `closeStatus` 확보
- 후속 구현 포인트 TODO 명시

즉, 실제 방 퇴장 처리/방장 위임/게임 종료 처리는 아직 연결되지 않았다.

## 구현된 내용

### WebSocketConfig

- `/ws` STOMP endpoint 등록
- inbound channel에 `WebSocketAuthChannelInterceptor` 등록
- application prefix: `/app`
- simple broker prefix: `/topic`, `/queue`
- user destination prefix: `/user`

### WebSocketAuthChannelInterceptor

- `CONNECT` 요청만 인증
- `Authorization` 헤더에서 `Bearer ` 토큰 추출
- `WebSocketPrincipalResolver` 호출
- 인증 성공 시 `accessor.setUser(principal)`

### StompPrincipal

- WebSocket 세션 사용자 식별자
- `getName()`은 `memberId` 문자열 반환

### WebSocketPrincipalResolver

현재 JWT 구조를 전제로 아래 흐름으로 동작한다.

```text
token 검증
→ email 추출
→ email로 member 조회
→ memberId 획득
→ StompPrincipal 생성
```

JWT 예외는 다음처럼 나눈 상태다.

- 만료 토큰: `TOKEN_EXPIRED`
- 서명 오류 / 형식 오류 / 비정상 토큰: `INVALID_TOKEN`
- 토큰은 유효하지만 회원이 없음: `MEMBER_NOT_FOUND`

### WebSocketMessageSender

- `convertAndSend()` 기반 브로드캐스트 전송
- `convertAndSendToUser()` 기반 개인 메시지 전송

현재 구현:

```java
convertAndSendToUser(memberId, "/queue/private", payload)
```

### WebSocketSessionManager

- 인증 상태 변경 시 `FORCE_DISCONNECT` 메시지를 개인 채널로 전송
- 현재 구현은 서버 측 세션 `close()`가 아니라 클라이언트 측 disconnect 유도 방식
- 따라서 클라이언트가 메시지를 수신한 뒤 연결 종료를 수행해야 한다

### WebSocketExceptionHandler

- `BusinessException` → `ERROR` 유니캐스트 응답
- 예기치 않은 `Exception` → `INTERNAL_SERVER_ERROR` 유니캐스트 응답
- `Principal == null`이면 응답 대상이 없어 바로 반환

### WebSocketStompErrorHandler

- `CONNECT` 단계에서 채널 인터셉터가 던진 예외 처리
- `BusinessException`이면 해당 `ErrorCode`를 유지
- 기타 예외는 `INTERNAL_SERVER_ERROR`로 변환
- 응답 payload는 `WebSocketErrorResponse` JSON 구조 유지
- 응답 transport는 STOMP `ERROR` 프레임

### WebSocketEventListener

- `SessionDisconnectEvent` 수신
- 인증된 사용자의 `memberId`, `sessionId`, `closeStatus` 로그 기록
- 실제 퇴장 처리 연결 전 단계

## Why

### 먼저 공통 기반을 만든 이유

READY, KICK, CHAT, GAME_START 같은 이벤트를 바로 구현하면 각 도메인에서 인증, 예외, 전송, disconnect 처리를 중복해서 다루게 된다.  
초기에 공통 규칙을 정리해두면 이후 도메인 구현 속도와 일관성이 좋아진다.

### memberId 기반 Principal을 고정한 이유

현재 WebSocket 이후 로직은 대부분 "누가 요청했는가"를 `memberId` 기준으로 판단하는 편이 자연스럽다.  
세션에 email이 아니라 `memberId`를 저장해두면 권한 검증, 방 상태 처리, 게임 결과 저장 흐름과 더 잘 맞는다.

### sender를 얇게 유지한 이유

도메인 DTO 구조를 sender가 알게 되면 전역 계층이 이벤트 스키마에 결합된다.  
지금 구조처럼 destination과 payload만 받아 전송하면, 이벤트 DTO는 각 도메인에서 독립적으로 설계할 수 있다.

## Caution

### 1. 현재 JWT subject는 email

WebSocket 세션에는 `memberId`를 저장하지만, JWT `sub`는 아직 `email`이다.  
그래서 CONNECT 때마다 내부적으로 `email → memberId` 변환이 한 번 필요하다.

장기적으로 `sub=memberId` 전환은 가능하지만, 아래도 함께 수정해야 한다.

- `JwtProvider`
- `JwtAuthenticationFilter`
- `AuthServiceImpl`
- `OAuth2FailureHandler`
- 관련 테스트

### 2. 개인 메시지 구독 경로 문서 정합성 필요

현재 sender는 `convertAndSendToUser(memberId, "/queue/private", payload)`를 사용하고, config는 `setUserDestinationPrefix("/user")`를 사용한다.

즉 실제 클라이언트 구독 경로는 `/user/queue/private`가 된다.

따라서 WebSocket 명세에서 개인 메시지 구독 경로가 아직 `/queue/private`로 적혀 있다면, 클라이언트 기준 설명은 `/user/queue/private`로 수정해야 한다.

단, CONNECT 인증 실패는 아직 user destination을 사용할 수 없으므로 예외적으로 STOMP `ERROR` 프레임으로 응답한다.

### 3. disconnect 처리에 필요한 세션-방 매핑 저장소가 아직 없음

현재 disconnect 이벤트만으로는 "이 사용자가 어떤 room에 속해 있었는지"를 알 수 없다.

아래 기능을 구현하려면 별도 저장소가 먼저 필요하다.

- 비정상 종료 시 `PLAYER_LEFT`
- 방장 이탈 시 `HOST_DELEGATED`
- 게임 중 disconnect 처리
- room 정리 로직

즉 후속 구현 전에 최소한 아래 매핑 전략이 필요하다.

```text
sessionId ↔ memberId ↔ roomId
```

### 4. FORCE_DISCONNECT는 서버 측 소켓 강제 종료가 아님

현재 `WebSocketSessionManager`는 `FORCE_DISCONNECT` 메시지만 전송하고 실제 `WebSocketSession.close()`는 호출하지 않는다.

- 장점: 구현이 단순하고 현재 STOMP 유니캐스트 구조에 바로 얹을 수 있다
- 한계: 클라이언트가 메시지를 무시하거나 수신하지 못하면 서버 측 세션이 즉시 정리된다고 보장할 수 없다

실제 서버 측 강제 종료가 필요해지면 아래가 추가로 필요하다.

- `WebSocketSession` 객체 저장소
- `WebSocketHandlerDecoratorFactory` 기반 세션 추적
- 종료 시점의 `session.close(...)` 호출

### 4. WebSocket 요청 body의 playerId 사용 방식은 추후 합의 필요

현재 임시 명세에는 요청 DTO에 `playerId`가 포함돼 있는 경우가 많다.  
한편 서버는 CONNECT 단계에서 인증된 `Principal`도 가지고 있으므로, 이후 도메인 구현에서는 "행동 주체를 request의 `playerId`로 볼지", "세션의 `Principal`로 볼지"를 팀 내에서 명확히 합의한 뒤 일관되게 적용해야 한다.

### 5. Room 도메인은 아직 실제 서비스 구현이 없음

현재 [`RoomService.java`](/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/domain/room/service/RoomService.java:1)는 비어 있다.  
즉 READY/KICK/LEAVE/CHAT/HOST_TRANSFER 같은 이벤트는 아직 공통 인프라만 있고, 실제 도메인 처리 계층은 다음 단계에서 구현해야 한다.

## 후속 개발 가이드

다음 백엔드 개발자는 아래 순서로 이어서 작업하는 것이 안전하다.

1. WebSocket 명세 정리
   - `/user/queue/private` 표기 정합성 맞추기
   - 이벤트 타입 네이밍 최종 확정
   - ErrorCode와 임시 명세 코드값 정합성 맞추기

2. Room 상태 저장소 설계
   - room 멤버 목록
   - host 여부
   - ready 상태
   - sessionId ↔ roomId ↔ memberId 매핑

3. Room 도메인 WebSocket 핸들러 구현
   - READY_UPDATE
   - GAME_START
   - KICK_REQUEST
   - LEAVE
   - CHAT
   - HOST_TRANSFER_REQUEST

4. disconnect 처리 연결
   - `PLAYER_LEFT`
   - `HOST_DELEGATED`
   - 게임 중 이탈 처리

5. 모드별 게임 핸들러 구현
   - contribution
   - time-attack
   - coop

## Test Plan

- STOMP CONNECT 시 JWT 인증이 정상 동작하는지 확인
- 인증 성공 후 `Principal.getName()`이 `memberId`를 반환하는지 확인
- 개인 메시지가 `/user/queue/private` 구독으로 수신되는지 확인
- `BusinessException` 발생 시 `ERROR/code/message` 포맷으로 유니캐스트되는지 확인
- disconnect 시 최소한 `memberId`, `sessionId`, `closeStatus` 로그가 남는지 확인
- 이후 room 상태 저장소가 붙으면 disconnect 후 멤버 제거와 host 재선정까지 통합 검증
