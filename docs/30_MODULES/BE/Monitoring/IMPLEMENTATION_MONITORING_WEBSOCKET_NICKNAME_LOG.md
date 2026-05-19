# WebSocket 이벤트 로그 강화 및 nickname MDC 주입

## Background / Context

기존 로그에는 `memberId`만 포함되어 있어 Grafana/Loki에서 로그를 확인할 때 사용자를 직관적으로 식별하기 어려웠다.
또한 WebSocket CONNECT/SUBSCRIBE/SEND 이벤트에 대한 로그가 부족해 실시간 게임(협력/기여 모드) 장애 추적이 어려웠다.
게임 서비스 메서드 진입 로그가 없어 Redis 락 획득 전 단계에서 요청이 실제로 도달했는지 확인할 수 없었다.

## Decision

JWT에 nickname을 클레임으로 추가하고, 인증 완료 시점에 MDC에 주입한다.
logback 패턴에 `[%X{nickname:-}]`을 추가해 개별 서비스 코드를 수정하지 않아도 모든 로그에 nickname이 자동 포함되도록 한다.
WebSocket 핸들러와 이벤트 리스너에서 CONNECT/SUBSCRIBE/SEND/DISCONNECT 이벤트를 로그로 남기고, 도메인 prefix([ROOM]/[COOP]/[CONTRIBUTION])를 붙인다.

**수정 파일**

```
global/jwt/
  JwtProvider.java                      # createAccessToken에 nickname 파라미터 추가, getNickname() 추가

domain/auth/service/
  AuthServiceImpl.java                  # createAccessToken 호출 3곳에 nickname 전달 (null-safe)

domain/member/model/
  CustomUserDetails.java                # nickname 필드 추가, from() 팩토리 메서드 수정

global/websocket/auth/
  StompPrincipal.java                   # record에 nickname 필드 추가
  WebSocketPrincipalResolver.java       # StompPrincipal 생성 시 nickname 전달 (null-safe)
  WebSocketAuthChannelInterceptor.java  # SUBSCRIBE 로그 추가, CONNECT 성공 로그에 nickname 포함, resolveDomain() 추가

global/filter/
  JwtAuthenticationFilter.java          # 인증 완료 후 MDC.put("nickname", ...) 추가

resources/
  logback-spring.xml                    # CONSOLE/LOKI 패턴에 [%X{nickname:-}] 추가

domain/room/controller/
  RoomHandler.java                      # MDC nickname 주입, [ROOM] SEND 로그 추가
  RoomWebSocketController.java          # MDC nickname 주입, [ROOM] SEND 로그 추가

domain/coop/controller/
  CoopController.java                   # MDC nickname 주입, [COOP] SEND 로그 추가

domain/coop/service/
  CoopGameServiceImpl.java              # processInput/processReset 진입 로그 추가

domain/competitive/controller/
  ContributionHandler.java              # MDC nickname 주입, [CONTRIBUTION] SEND 로그 추가

domain/competitive/service/
  ContributionGameServiceImpl.java      # processInput/processExpireRequest 진입 로그 추가
```

---

## 변경 내용 상세

### 1. JWT nickname 클레임 추가

`JwtProvider.createAccessToken(String email, String nickname)`으로 시그니처 변경.
토큰 빌더에 `claim("nickname", nickname)` 추가, `getNickname(String token)` 메서드 추가.
`AuthServiceImpl`의 로컬 로그인 / OAuth 로그인 / 토큰 재발급 3곳에 `member.getNickname() != null ? member.getNickname() : ""`로 null-safe하게 전달.

### 2. MDC nickname 주입

**REST API**
`JwtAuthenticationFilter`에서 SecurityContext 등록 후 `jwtProvider.getNickname(token)`으로 JWT 클레임에서 직접 nickname을 추출해 `MDC.put("nickname", ...)` 호출.
`MdcLoggingFilter`가 이미 `MDC.clear()`를 담당하므로 별도 제거 불필요.

**WebSocket**
각 핸들러(`RoomHandler`, `RoomWebSocketController`, `CoopController`, `ContributionHandler`)의 try/finally 블록 진입 시 `MDC.put("nickname", principal instanceof StompPrincipal sp ? sp.nickname() : "")` 추가.

### 3. logback 패턴 변경

```xml
<!-- 변경 전 -->
%d{HH:mm:ss.SSS} %-5level [%X{requestId:-}] %logger{36} - %msg%n

<!-- 변경 후 -->
%d{HH:mm:ss.SSS} %-5level [%X{requestId:-}] [%X{nickname:-}] %logger{36} - %msg%n
```

CONSOLE과 LOKI appender 패턴 모두 동일하게 적용.
nickname이 없는 요청(미인증, 시스템 이벤트)은 `[]`로 출력된다.

### 4. WebSocket 이벤트 로그

| 이벤트 | 위치 | 레벨 | 로그 예시 |
|---|---|---|---|
| CONNECT 성공 | WebSocketAuthChannelInterceptor | INFO | `WebSocket CONNECT success. memberId=..., nickname=..., sessionId=...` |
| CONNECT 실패 | WebSocketAuthChannelInterceptor | WARN | `WebSocket CONNECT rejected - ...` |
| SUBSCRIBE | WebSocketAuthChannelInterceptor | INFO | `[COOP] WebSocket SUBSCRIBE. destination=/topic/room/1/coop, memberId=...` |
| DISCONNECT (정상) | WebSocketEventListener | INFO | `WebSocket Disconnected. memberId=..., sessionId=..., closeStatus=...` |
| DISCONNECT (비인증) | WebSocketEventListener | DEBUG | `WebSocket Disconnected without authenticated principal. ...` |
| 중복 연결 감지 | WebSocketEventListener | INFO | `WebSocket duplicate connection detected, sending force disconnect to old sessions. memberId=..., oldSessions=...` |
| SEND (ROOM) | RoomHandler / RoomWebSocketController | INFO | `[ROOM] WebSocket SEND. destination=/room/{roomId}/ready` |
| SEND (COOP) | CoopController | INFO | `[COOP] WebSocket SEND. destination=/room/{roomId}/coop/input` |
| SEND (CONTRIBUTION) | ContributionHandler | INFO | `[CONTRIBUTION] WebSocket SEND. destination=/room/{roomId}/contribution/commands` |

SUBSCRIBE 도메인 분류는 `WebSocketAuthChannelInterceptor.resolveDomain()`이 destination URL 패턴 매칭으로 처리한다 (`/coop` → COOP, `/contribution` → CONTRIBUTION, `/room` → ROOM).

### 5. 게임 서비스 진입 로그

| 메서드 | 로그 예시 |
|---|---|
| `CoopGameServiceImpl.processInput` | `[coop] input received. gameSessionId=..., memberId=...` |
| `CoopGameServiceImpl.processReset` | `[coop] reset received. gameSessionId=..., memberId=...` |
| `ContributionGameServiceImpl.processInput` | `[contribution][input] received. roomId=..., memberId=..., gameSessionId=...` |
| `ContributionGameServiceImpl.processExpireRequest` | `[contribution][expireRequest] received. roomId=..., memberId=..., gameSessionId=..., commandSequence=...` |

---

## Why

**JWT 클레임에 nickname 추가**

매 요청마다 DB에서 nickname을 조회하는 대신 JWT에 포함해 인증 흐름에서 한 번에 추출한다.
nickname은 중복 불가 유니크 값이므로 로그 식별자로 적합하다. 변경 시 재로그인이 필요하지만 게임 서비스 특성상 세션이 짧아 실질적 문제 없음.

**logback 패턴 일괄 적용**

MDC에 nickname이 있으면 logback이 자동으로 모든 로그에 포함시킨다. 서비스 레이어 수백 개의 `log.info` 호출을 수정하지 않아도 되고, 향후 추가되는 로그도 자동 적용된다.

**진입 로그 위치 선정**

Redis 락 획득 이전에 진입 로그를 찍어 락 대기/타임아웃으로 인해 warn 이전에 요청이 사라지는 케이스를 포착할 수 있다. coop은 `gameSessionId` null 체크 이후에 위치해 GAME_ALREADY_ENDED 예외와 구분된다.

---

## Loki LogQL 예시

```logql
# 특정 nickname의 WebSocket 전체 이벤트 추적
{app="letsgitit"} |= "[hong]"

# COOP 도메인 SEND 이벤트만 조회
{app="letsgitit"} |= "[COOP] WebSocket SEND"

# CONTRIBUTION 게임 진입 로그 (roomId 기준)
{app="letsgitit"} |= "[contribution][input] received" |= "roomId=42"

# WebSocket 연결/해제 이벤트 타임라인
{app="letsgitit"} |~ "WebSocket (CONNECT|Disconnected)"

# COOP 입력 흐름 전체 (진입 → 정답/오답 → 라운드 완료)
{app="letsgitit"} |~ "\\[coop\\]"

# nickname 없는 요청 필터 (미인증 접근 감지)
{app="letsgitit"} |= "[]" != "[coop]" != "[contribution]"
```

---

## Caution

- nickname MDC는 인증이 완료된 요청에만 주입된다. 미인증 요청(헬스체크, 토큰 만료 등)은 nickname이 빈 값(`[]`)으로 출력된다.
- WebSocket 핸들러에서 MDC를 `finally`에서 `MDC.clear()`로 정리한다. 스레드 풀 재사용 환경에서 이전 요청의 nickname이 남지 않도록 주의.
- nickname 변경(회원정보 수정)은 기존 JWT에 즉시 반영되지 않는다. 토큰 만료 후 재발급 시에만 새 nickname이 로그에 표시된다.
- `StompPrincipal`이 record로 변경되어 `name()` 대신 `getName()`을 사용해야 한다. `getName()`은 `Principal` 인터페이스 구현이고, `name()`은 record 컴포넌트 접근자다 — 둘 다 동일한 값을 반환하지만 `Principal` 인터페이스 계약상 `getName()` 사용을 권장한다.
    