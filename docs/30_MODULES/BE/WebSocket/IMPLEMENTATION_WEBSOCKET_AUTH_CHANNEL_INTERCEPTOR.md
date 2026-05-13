# IMPLEMENTATION_WEBSOCKET_AUTH_CHANNEL_INTERCEPTOR

## Background / Context

STOMP 기반 WebSocket 연결은 HTTP 요청과 별도의 연결 흐름을 가진다.  
따라서 HTTP 구간에서 동작하는 Spring Security JWT 필터만으로는 WebSocket CONNECT 시점의 인증을 처리할 수 없다.

멀티플레이어 게임에서는 CONNECT 이후 `SEND`, `SUBSCRIBE` 메시지에서 현재 사용자를 안정적으로 식별할 수 있어야 한다.  
특히 방 참가 상태, 방장 권한, 강퇴 처리, 게임 시작 권한 같은 후속 로직은 모두 "누가 요청했는가"를 기준으로 동작하므로, CONNECT 단계에서 인증된 사용자를 WebSocket 세션에 미리 등록하는 과정이 필요했다.

이 요구를 처리하기 위해 [`WebSocketAuthChannelInterceptor.java`](/Users/mosun/개발/gitit/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/auth/WebSocketAuthChannelInterceptor.java:1)를 두고, STOMP CONNECT 요청만 가로채 JWT를 검증한 뒤 `Principal`을 세션에 주입하도록 구현했다.
또한 CONNECT 인증 실패 응답 형식을 통일하기 위해 [`WebSocketStompErrorHandler.java`](/Users/mosun/개발/gitit/S14P31A304/BE/letsgitit/src/main/java/com/gitcat/letsgitit/global/websocket/WebSocketStompErrorHandler.java:1)를 함께 둔다.

## Decision

### 1. CONNECT 시점에만 JWT 인증 수행

인터셉터는 모든 STOMP 메시지를 받지만, 실제 인증은 `StompCommand.CONNECT`일 때만 수행한다.

- `CONNECT`: Authorization 헤더에서 JWT를 읽고 인증 수행
- `SEND`, `SUBSCRIBE`, `DISCONNECT`: 이미 세션에 등록된 `Principal` 사용

이 방식으로 CONNECT 이후 메시지마다 JWT를 다시 파싱하거나 회원 조회를 반복하지 않도록 했다.

단, CONNECT 단계에서 인터셉터가 예외를 던지면 이는 `@MessageMapping` 내부 예외가 아니므로 `@MessageExceptionHandler`가 아니라 STOMP 프로토콜 레벨 에러 처리기로 흘러간다.

### 5. CONNECT 실패는 STOMP ERROR 프레임으로 통일

`WebSocketAuthChannelInterceptor`의 `preSend()`에서 발생한 예외는 채널 인터셉터 레벨 예외다.  
따라서 `@MessageExceptionHandler`로는 잡히지 않고, 별도 STOMP 에러 핸들러가 필요하다.

현재는 `WebSocketConfig`에서 `StompEndpointRegistry#setErrorHandler(...)`로 `WebSocketStompErrorHandler`를 등록해 아래 규칙으로 처리한다.

- `BusinessException`이면 해당 `ErrorCode`를 그대로 사용
- 그 외 예외면 `INTERNAL_SERVER_ERROR`로 변환
- 응답 payload는 `WebSocketErrorResponse` JSON 구조를 유지
- 응답 transport는 `/user/queue/private` 유니캐스트가 아니라 STOMP `ERROR` 프레임

### 2. Authorization 헤더 파싱 책임은 인터셉터가 담당

인터셉터는 아래 최소 책임만 가진다.

- STOMP CONNECT 여부 판별
- `Authorization` 헤더 추출
- `Bearer ` prefix 검증
- resolver 호출
- `accessor.setUser(...)`로 세션에 `Principal` 등록

헤더명과 prefix는 상수로 분리했다.

```java
private static final String AUTHORIZATION = "Authorization";
private static final String BEARER_PREFIX = "Bearer ";
```

### 3. JWT 해석과 Principal 생성은 Resolver로 분리

실제 토큰 검증과 사용자 식별은 `WebSocketPrincipalResolver`에 위임한다.  
이렇게 분리하면 인터셉터가 비대해지지 않고, 이후 JWT subject 구조가 바뀌더라도 변경 범위를 resolver 중심으로 관리할 수 있다.

의도한 흐름은 다음과 같다.

```text
1. 클라이언트가 STOMP CONNECT 요청 전송
2. Authorization 헤더에서 JWT 추출
3. JWT 검증
4. 토큰에서 사용자 식별
5. StompPrincipal 생성
6. WebSocket 세션에 Principal 등록
7. 이후 SEND, SUBSCRIBE 요청에서는 등록된 Principal 사용
```

### 4. WebSocket 단계는 인증만 담당하고, 인가는 도메인 서비스에서 처리

이 인터셉터의 역할은 "이 사용자가 누구인지 확인"하는 데까지다.

- 인증(Authentication)
  - CONNECT 시점에 JWT 검증
  - 인증된 사용자를 `StompPrincipal`로 세션에 저장

- 인가(Authorization)
  - 방장만 게임 시작 가능
  - 방 참가자만 READY 변경 가능
  - 강퇴 권한 보유 여부 확인
  - 방 상태에 따라 요청 허용/거부

이런 인가 판단은 `READY_UPDATE`, `KICK_REQUEST`, `GAME_START` 같은 각 도메인 서비스 로직에서 처리하도록 경계를 분리했다.

## Why

### WebSocket 세션에 Principal을 미리 등록하는 이유

CONNECT 단계에서 `Principal`을 세션에 등록해두면 이후 메시지 처리에서 현재 사용자를 안정적으로 재사용할 수 있다.  
메시지마다 Authorization 헤더를 다시 읽거나 JWT를 재검증하는 구조보다 단순하고, 핸들러/서비스 계층의 코드도 더 명확해진다.

### 인터셉터와 Resolver를 분리한 이유

인터셉터는 메시지 진입점 제어에 집중하고, JWT 검증과 사용자 식별은 별도 컴포넌트에 두는 편이 책임이 명확하다.  
특히 subject를 `email`에서 `memberId`로 바꾸는 식의 인증 정책 변경이 생겨도 resolver 수정으로 수렴시킬 수 있다.

### 인증과 인가를 나눈 이유

CONNECT 단계에서 방장 여부나 방 상태까지 검증하면 WebSocket 진입 계층이 도메인 규칙을 과도하게 알게 된다.  
인증은 전역 계층에서, 인가는 방/게임 도메인에서 처리해야 변경 영향이 작고 테스트도 쉬워진다.

## Caution

### 현재 JWT subject는 email 기준

현재 구조에서는 JWT의 `sub` claim에 `email`이 들어 있다.  
그래서 WebSocket 인증 시 내부적으로 아래 변환이 한 번 필요하다.

```text
token
→ email
→ member 조회
→ memberId
```

이 조회는 STOMP CONNECT 시점에만 발생하므로 즉시 큰 병목이 되지는 않는다.  
다만 WebSocket 이후 로직이 대부분 `memberId` 기준으로 흐르기 때문에, 장기적으로는 JWT subject도 `memberId`로 맞추는 편이 더 일관적이다.

### JWT subject를 memberId로 바꾸면 관련 인증 흐름 전체를 함께 수정해야 함

`sub=email`에서 `sub=memberId`로 전환하려면 `JwtProvider`만 바꿔서는 안 된다.  
현재 백엔드 구조상 아래 흐름도 함께 정리해야 한다.

- `JwtProvider`
- `JwtAuthenticationFilter`
- `AuthServiceImpl`
- `OAuth2FailureHandler`
- 관련 단위 테스트

즉, WebSocket 문맥에서 필요성이 있더라도 이 변경은 별도 이슈로 분리해 인증 축 전체를 함께 다루는 것이 안전하다.

### CONNECT 이후 도메인 권한 검증을 생략하면 안 됨

세션에 `Principal`이 등록되었다고 해서 모든 메시지가 허용되는 것은 아니다.  
메시지 핸들러나 서비스 계층에서 반드시 아래 검증이 추가로 필요하다.

- 현재 사용자가 해당 방 참가자인지
- 현재 사용자가 방장인지
- 게임 상태상 지금 요청이 가능한지
- 강퇴/준비/시작 같은 행위의 권한이 있는지

## Test Plan

- Authorization 헤더가 없으면 CONNECT를 거부하는지 확인
- `Bearer ` prefix가 아니면 `INVALID_TOKEN` 예외를 던지는지 확인
- 유효한 JWT일 때 `StompPrincipal`이 세션에 등록되는지 확인
- CONNECT 실패 시 STOMP `ERROR` 프레임 payload가 `WebSocketErrorResponse` 형식인지 확인
- CONNECT가 아닌 `SEND`, `SUBSCRIBE` 메시지는 그대로 통과하는지 확인
- 이후 메시지 처리 단계에서 `principal.getName()`으로 `memberId`를 안정적으로 사용할 수 있는지 확인
