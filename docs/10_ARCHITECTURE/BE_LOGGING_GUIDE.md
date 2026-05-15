# 백엔드 로깅 가이드 (Loki + Grafana 연동 기준)

> 기능 구현 완료 후 이 문서의 **체크리스트**를 반드시 확인하고 PR을 올립니다.

---

## 1. 파이프라인 개요

```
코드 (log.info / log.warn / log.error)
  ↓
logback-spring.xml (Loki4jAppender — prod 프로파일에서만 전송)
  ↓
Loki (http://{LOKI_HOST}:3100)
  ↓
Grafana (LogQL로 조회 및 대시보드)
```

**핵심 구성 요소**

| 구성 | 역할 |
|------|------|
| `MdcLoggingFilter` | HTTP 요청마다 `requestId`를 MDC에 주입. `X-Request-ID` 헤더가 있으면 그 값, 없으면 랜덤 8자리 생성 |
| `logback-spring.xml` | prod 프로파일에서 Loki로 전송. root level=`INFO`이므로 **DEBUG 로그는 Loki에 미전송** |
| Loki label | `app=letsgitit`, `level`, `host`, `profile=prod` |
| 로그 패턴 | `{날짜} {레벨} [{requestId}] [{thread}] {logger} - {메시지}` |

---

## 2. 로그 레벨 기준

| 레벨 | 기준 | 예시 |
|------|------|------|
| `ERROR` | 예상치 못한 서버 오류. 반드시 스택트레이스 포함 | DB 커넥션 실패, NPE, 처리 불가 예외 |
| `WARN` | 비즈니스 예외, 보안 이벤트, 비정상 요청 | 잘못된 토큰, 권한 없는 접근, 인증 실패 |
| `INFO` | 정상 흐름의 주요 상태 변경. **Loki에 저장되는 기본 레벨** | 로그인, 회원가입, 게임 시작/종료 |
| `DEBUG` | 개발용 상세 로그. **prod Loki에 전송되지 않음** | 파라미터 추적, 중간 처리 상태 |

> `System.out.println` 사용 금지. 반드시 `@Slf4j` 사용.

---

## 3. 메시지 형식 표준

### 3.1 HTTP 도메인 (Service 계층)

```
[{도메인}][{메서드명}] {key}={value}, {key}={value}
```

**예시**

```java
log.info("[auth][login] type=local");
log.info("[single][startSession] difficulty=NORMAL, sessionId={}", sessionId);
log.warn("[single][saveResult] error. sessionId={}, errorCode={}", sessionId, errorCode);
```

**규칙**
- 도메인명: `auth`, `single`, `ranking`, `member`, `room`, `competitive`, `coop`, `dictionary`, `record`, `tutorial` 등 패키지명 기준
- 메서드명: 서비스 메서드명 그대로 사용 (camelCase)
- key=value 형식으로 컨텍스트 추가
- **이메일, 비밀번호, 토큰 값 등 민감정보 포함 금지**

### 3.2 WebSocket 도메인

```
WebSocket {이벤트}. {key}={value}, {key}={value}
```

**예시**

```java
log.info("WebSocket CONNECT success. memberId={}, sessionId={}", memberId, sessionId);
log.warn("WebSocket CONNECT rejected - token validation failed. sessionId={}, errorCode={}", sessionId, errorCode);
log.warn("WebSocket 비즈니스 예외. memberId={}, errorCode={}", memberId, errorCode);
log.info("WebSocket 강제 연결 종료 알림. memberId={}, reason=LOGOUT", memberId);
```

---

## 4. MDC requestId 처리

Loki에서 단일 요청/세션의 전체 로그를 추적하려면 `requestId`가 MDC에 있어야 합니다.

### 4.1 HTTP 요청

`MdcLoggingFilter`가 자동으로 처리합니다. 별도 작업 불필요.

```
클라이언트 X-Request-ID 헤더 → MDC requestId (없으면 서버가 랜덤 생성)
```

### 4.2 WebSocket

HTTP 필터가 적용되지 않으므로 **직접 MDC를 세팅**해야 합니다.

```java
MDC.put("requestId", "ws-" + sessionId);
try {
    log.info("...");
} finally {
    MDC.clear();
}
```

- prefix `ws-`로 HTTP 요청과 구분
- `sessionId`가 null일 수 있으면 `(sessionId != null ? sessionId : "unknown")` 처리

### 4.3 스케줄러 / 비동기

스레드 풀에서 실행되므로 MDC가 전파되지 않습니다.

```java
MDC.put("requestId", "scheduler-" + taskName);
try {
    log.info("...");
} finally {
    MDC.clear();
}
```

---

## 5. 계층별 필수 로그 포인트

### 5.1 Service 계층

| 상황 | 레벨 | 필수 여부 |
|------|------|-----------|
| 주요 비즈니스 로직 성공 (생성/수정/삭제) | INFO | **필수** |
| BusinessException 발생 (보안·인가 관련) | WARN | **필수** |
| 예상치 못한 Exception | ERROR (스택트레이스 포함) | **필수** |
| 조회(read-only) 성공 | 생략 권장 | - |

```java
// 생성/수정/삭제 성공
log.info("[room][create] memberId={}, roomId={}, mode={}", memberId, roomId, mode);

// 보안·인가 관련 예외
log.warn("[room][join] 인원 초과 입장 시도. memberId={}, roomId={}", memberId, roomId);

// 예상치 못한 오류
log.error("[room][start] 예상치 못한 오류. roomId={}", roomId, e);
```

### 5.2 WebSocket 핸들러 (@MessageMapping)

| 상황 | 레벨 | 필수 여부 |
|------|------|-----------|
| 게임 상태 변경 (시작/종료/강퇴 등) | INFO | **필수** |
| 권한 없는 요청, 잘못된 입력 | WARN | **필수** |

```java
log.info("[contribution][input] memberId={}, roomId={}, commandSequence={}", memberId, roomId, seq);
log.warn("[room][kick] 방장 아닌 사용자의 강퇴 시도. memberId={}, roomId={}", memberId, roomId);
```

### 5.3 예외 핸들러

| 핸들러 | 레벨 | 필수 여부 |
|--------|------|-----------|
| `GlobalExceptionHandler` — BusinessException | INFO | 이미 구현됨 (수정 금지) |
| `GlobalExceptionHandler` — Exception | ERROR (스택트레이스) | 이미 구현됨 (수정 금지) |
| `WebSocketExceptionHandler` — BusinessException | WARN + MDC | **필수** |
| `WebSocketExceptionHandler` — Exception | ERROR (스택트레이스) + MDC | **필수** |

> `GlobalExceptionHandler`는 모든 HTTP 도메인에서 공통으로 BusinessException을 `INFO`로 처리합니다.
> 보안·인가 관련 예외처럼 별도로 추적이 필요한 경우에만 Service 계층에서 직접 `log.warn`을 추가합니다.

---

## 6. 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| `System.out.println` | Loki로 수집되지 않음 |
| 비밀번호, 토큰 값 로그 출력 | 보안 — Loki는 장기 저장됨 |
| 이메일 주소 로그 출력 | 개인정보 보호 |
| ERROR 레벨에서 스택트레이스 생략 | 원인 추적 불가 |
| 조회 API 성공마다 INFO 출력 | 로그량 과다, 노이즈 |
| DEBUG 레벨에 민감정보 포함 | dev 환경 콘솔에 노출 가능성 |

---

## 7. 기능 구현 후 체크리스트

PR 올리기 전 아래 항목을 확인합니다.

### 필수

- [ ] `@Slf4j` 선언 (`System.out.println` 없음)
- [ ] 주요 상태 변경(생성/수정/삭제/게임 이벤트)에 `log.info` 추가
- [ ] `BusinessException` 발생 지점 중 보안·인가 관련에 `log.warn` 추가
- [ ] 예상치 못한 `Exception`에 `log.error(..., e)` 추가 (스택트레이스 포함)
- [ ] 로그에 비밀번호·토큰 값·이메일 미포함 확인

### WebSocket 도메인 추가 확인

- [ ] MDC `try { ... } finally { MDC.clear() }` 패턴 적용
- [ ] `sessionId` null 방어 처리 (`"unknown"` 폴백)

### 스케줄러 / 비동기 추가 확인

- [ ] MDC에 `scheduler-{taskName}` 형태로 requestId 세팅

---

## 8. Loki LogQL 활용

### 기본 검색

```logql
# 특정 requestId로 HTTP 요청 전체 추적
{app="letsgitit"} |= "[abc12345]"

# 특정 WebSocket 세션 전체 추적
{app="letsgitit"} |= "ws-{sessionId}"

# 특정 도메인 이벤트만 조회
{app="letsgitit"} |= "[room]"

# 에러 레벨 전체
{app="letsgitit", level="ERROR"}

# WARN 이상만 조회
{app="letsgitit"} | level =~ "WARN|ERROR"
```

### 도메인별 이벤트 조회

```logql
# 인증 이벤트 타임라인
{app="letsgitit"} |~ "\[auth\]\[(login|logout|register)\]"

# 로그인 실패만
{app="letsgitit", level="WARN"} |= "[auth]"

# 특정 방의 WebSocket 이벤트
{app="letsgitit"} |= "roomId={roomId 값}"

# 게임 시작 이벤트 수 (5분 집계)
count_over_time({app="letsgitit"} |= "[room][start]" [5m])
```

### 이상 감지

```logql
# ERROR 로그 급증 감지
sum(count_over_time({app="letsgitit", level="ERROR"} [1m]))

# 인증 실패 빈도
count_over_time({app="letsgitit", level="WARN"} |= "[auth]" [5m])

# WebSocket CONNECT 실패
count_over_time({app="letsgitit", level="WARN"} |= "CONNECT rejected" [5m])
```

---

## 9. 도메인별 로그 메시지 목록

구현 완료 시 아래 테이블에 추가합니다.

| 도메인 | 이벤트 | 레벨 | 메시지 형식 |
|--------|--------|------|-------------|
| auth | 이메일 코드 발송 | INFO | `[auth][sendEmailCode] purpose={purpose}` |
| auth | 이메일 인증 완료 | INFO | `[auth][verifyEmailCode] purpose={purpose}` |
| auth | 회원가입 완료 | INFO | `[auth][register] reactivated={boolean}` |
| auth | 로컬 로그인 | INFO | `[auth][login] type=local` |
| auth | OAuth 로그인 | INFO | `[auth][login] type=oauth` |
| auth | 토큰 재발급 | INFO | `[auth][reissue]` |
| auth | 로그아웃 | INFO | `[auth][logout]` |
| auth | 비밀번호 변경 | INFO | `[auth][resetPassword]` |
| auth | 비밀번호 검증 | INFO | `[auth][verifyPassword]` |
| single | 세션 시작 | INFO | `[single][startSession] difficulty={difficulty}, sessionId={id}` |
| single | 결과 저장 성공 | INFO | `[single][saveResult] sessionId={id}, difficulty={difficulty}, score={score}, isNewRecord={bool}` |
| single | 결과 저장 실패 | WARN | `[single][saveResult] error. sessionId={id}, errorCode={code}` |
| ranking | 점수 갱신 | INFO | `[ranking][updateScore] difficulty={difficulty}, score={score}, rank={rank}` |
| room | 비밀번호 검증 완료 | INFO | `[room][verifyRoomPassword] roomId={id}, memberId={id}` |
| room | 멤버 퇴장 | INFO | `[room][leaveRoom] roomId={id}, memberId={id}` |
| room | 방 해산 | INFO | `[room][leaveRoom] 방 해산. roomId={id}` |
| room | 방장 위임 | INFO | `[room][leaveRoom] 방장 위임. roomId={id}, newHostId={id}` |
| room | 강제 퇴장 | INFO | `[room][kickMember] roomId={id}, playerId={id}` |
| room | 게임 시작 | INFO | `[room][startGame] roomId={id}, mode={mode}, gameSessionId={id}` |
| ws | CONNECT 성공 | INFO | `WebSocket CONNECT success. memberId={id}, sessionId={id}` |
| ws | CONNECT 거부 (헤더) | WARN | `WebSocket CONNECT rejected - missing or invalid Authorization header. sessionId={id}` |
| ws | CONNECT 거부 (토큰) | WARN | `WebSocket CONNECT rejected - token validation failed. sessionId={id}, errorCode={code}` |
| ws | DISCONNECT | INFO | `WebSocket Disconnected. memberId={id}, sessionId={id}, closeStatus={status}` |
| ws | 강제 종료 알림 | INFO | `WebSocket 강제 연결 종료 알림. memberId={id}, reason={reason}` |
| ws | 비즈니스 예외 | WARN | `WebSocket 비즈니스 예외. memberId={id}, errorCode={code}` |
| ws | 예상치 못한 오류 | ERROR | `WebSocket 예상치 못한 오류. memberId={id}` |
