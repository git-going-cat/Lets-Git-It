# BE 로그 컨벤션

## 1. 기본 형식

```
log.{level}("[domain][methodName] message. field1={}, field2={}", val1, val2);
```

- **domain**: 모듈명 (소문자, 하이픈 허용)
- **methodName**: 로그가 속한 Java 메서드명 (camelCase)
- **message**: 영어로 작성, 문장 끝 `.` 포함
- **필드**: `key={}` 형식으로 파라미터 전달

### 예시

```java
log.info("[room][createCoopRoom] coop room created. roomId={}, hostMemberId={}", roomId, memberId);
log.warn("[room][joinCoopRoom] coop room join rejected: room full. roomId={}, currentPlayers={}, maxPlayers={}", roomId, cur, max);
log.error("[coop][endGameInternal] DB save failed. roomId={}", roomId, e);
```

---

## 2. domain 목록

| domain | 적용 범위 |
|---|---|
| `[room]` | RoomServiceImpl, CoopRoomServiceImpl, ContributionRoomServiceImpl, RoomRedisRepositoryImpl, RoomMemberRecoveryService 등 |
| `[coop]` | CoopGameServiceImpl, CoopGameRedisRepositoryImpl, CoopGraphDataStore |
| `[coop-ranking]` | CoopRankingServiceImpl, CoopRankingRedisRepositoryImpl |
| `[contribution]` | ContributionGameServiceImpl, ContributionGameRedisRepositoryImpl |
| `[auth]` | CustomOAuth2UserService, OAuth2SuccessHandler, OAuth2FailureHandler, JwtAuthenticationFilter, EmailServiceImpl |
| `[websocket]` | WebSocketStompErrorHandler, WebSocketOutboundLoggingInterceptor, WebSocketAuthChannelInterceptor, WebSocketEventListener 등 |

---

## 3. WebSocket 컨트롤러 (예외 규칙)

WebSocket transport 이벤트 진입점(Handler/Controller)은 **대문자 단일 브래킷**을 사용한다.  
서비스 레벨 로그(`[room][method]`)와 시각적으로 구분하기 위해 의도된 패턴이다.

```java
// 컨트롤러 — 대문자 단일 브래킷 (의도적)
log.info("[ROOM] WebSocket SEND. destination=/room/{}/ready", roomId);
log.info("[COOP] WebSocket SEND. destination=/room/{}/coop/input", roomId);
log.info("[CONTRIBUTION] WebSocket SEND. destination=/room/{}/contribution/commands", roomId);
```

적용 파일:
- `RoomHandler.java`
- `RoomWebSocketController.java`
- `CoopController.java`
- `ContributionHandler.java`

---

## 4. 예외 핸들러 (규칙 적용 제외)

아래 두 파일은 로그 형식 규칙을 적용하지 않는다.

- `GlobalExceptionHandler.java`
- `WebSocketExceptionHandler.java`

---

## 5. 로그 레벨 기준

| 레벨 | 사용 기준 |
|---|---|
| `info` | 정상 흐름: 방 생성, 입장, 업데이트, 게임 종료 등 |
| `warn` | 거부/검증 실패: 방 가득 참, 비밀번호 불일치, 권한 없음 등 |
| `error` | 복구 불가 실패: DB 저장 실패, JSON 직렬화 실패, Redis 상태 손상 등 |

---

## 6. 언어 규칙

- 모든 로그 메시지는 **영어**로 작성
- 한국어 로그 메시지 금지 (exception handler 제외)

---

## 7. 민감정보 로그 금지

아래 값은 로그에 남기지 않는다.

- accessToken
- refreshToken
- Authorization header 전체
- Cookie 전체
- password
- OAuth authorization code
- email 전체
- phone number

운영 환경에서는 정상 WebSocket payload 전체를 DEBUG/INFO로 남기지 않는다.
에러 분석이 필요한 경우에만 WARN/ERROR 로그에 필요한 필드만 남긴다.
