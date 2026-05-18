# IMPLEMENTATION_CONTRIBUTION_GAME_PROGRESS

## Background / Context

기여도 뺏기 모드는 대기실의 `GAME_START` 이후 서버가 내려준 `gameSessionId`를 기준으로 입력, 점수, 위치, 만료, 종료를 이어서 처리해야 한다.

기존 구현은 `/app/room/{roomId}/start`에서 `CONTRIBUTION_STARTED` payload를 브로드캐스트하는 흐름까지만 존재했고, 게임 시작 후 입력을 검증할 Redis 세션 상태와 `/app/room/{roomId}/contribution/commands` 핸들러가 없었다.

이번 작업은 랭킹 갱신과 결과 DB 저장을 제외하고, 이후 만료/종료 브랜치가 이어받을 수 있도록 기여도 게임의 세션 초기화와 입력 처리 기반을 구현한다.

## Decision

### 1. 게임 시작 시 Redis 세션 초기화

`RoomServiceImpl.startGame()`에서 `ContributionStartedResponse`를 만든 직후 `ContributionGameService.initializeSession(...)`을 호출한다.

저장 기준은 `gameSessionId`이며, 아래 키를 사용한다.

```text
contribution:session:{gameSessionId}:meta
contribution:session:{gameSessionId}:commands
contribution:session:{gameSessionId}:players
contribution:session:{gameSessionId}:scores
contribution:session:{gameSessionId}:positions
lock:contribution:session:{gameSessionId}:command:{commandSequence}
```

저장 내용:

- meta: `roomId`, `gameSessionId`, `commandSetId`, `status`, `startAt`, `totalCommands`, `initialBranch`
- commands: `commandSequence`, `text`, `branchName`, `status`, `winnerId`
- players: `playerId`, `nickname`, `bestContribution`
- scores: 플레이어별 성공 횟수, `CAT` 만료 횟수
- positions: 플레이어별 현재 브랜치

Redis value는 `gameStringRedisTemplate`과 Jackson JSON 문자열로 저장한다. 세션 초기화 API와 Redis 세션 캐시는 competitive 도메인 내부 DTO(`ContributionSessionCommand`, `ContributionSessionPlayer`, `ContributionCommandCache`, `ContributionPlayerCache`)를 사용해 room 응답 DTO 변경이 competitive 도메인에 직접 전파되지 않도록 분리했다.
모든 contribution session 키에는 장애 시 Redis 키가 영구 잔존하지 않도록 안전 TTL을 설정한다.

`RoomServiceImpl.startGame()`에서 `IN_GAME` 선점 이후 예외가 발생하면 room state를 `WAITING`으로 롤백하고, contribution 세션 키도 `deleteSession(gameSessionId)`로 정리한다.

### 2. 입력 WebSocket Handler 추가

`ContributionHandler`를 추가해 `/app/room/{roomId}/contribution/commands`를 처리한다.

요청자는 request body의 `playerId`가 아니라 STOMP `Principal`의 memberId로 식별한다.
Principal이 없는 미인증 요청은 게임 로직에 진입하지 않고 `AUTHENTICATION_REQUIRED` 에러를 반환한다.

성공 응답은 `/topic/room/{roomId}/contribution`으로 브로드캐스트하고, 입력 실패 메시지는 `/user/queue/private`로 유니캐스트한다.

`CONTRIBUTION_INPUT` 요청 DTO에는 `requestId`, `gameSessionId`, `commandSequence`, `inputText`, `type` 검증을 적용한다. `commandSequence`는 누락 시 0으로 역직렬화되지 않도록 `Integer`로 받으며, payload 변환/검증 실패는 WebSocket 에러 코드 `INVALID_REQUEST`로 응답한다.

### 3. 입력 처리와 동시성

`ContributionGameServiceImpl.processInput(...)`에서 아래 순서로 검증한다.

1. 세션 존재 여부
2. `roomId` / `gameSessionId` 정합성
3. 세션 상태
4. 참가자 여부
5. 명령어 존재 여부
6. 명령어 상태

같은 `commandSequence`에 대한 동시 입력은 Redisson lock으로 보호한다.
입력 이벤트가 무기한 대기하지 않도록 `tryLock(waitTime, leaseTime)`을 사용하며, 락 획득 실패는 `LOCK_ACQUISITION_FAILED`, 인터럽트는 `LOCK_INTERRUPTED`로 처리한다.
락 획득 후 명령어 상태를 다시 읽어 한 명만 성공 상태로 바꿀 수 있게 했다.

### 4. 응답 처리

switch 명령어는 `git switch {branch}` 형식으로만 판정한다.

- switch 성공: 위치 갱신 후 `POSITION_UPDATE`
- switch 오타: `CONTRIBUTION_INPUT_FAILED`, `errorReason=WRONG_COMMAND`
- switch 대상 브랜치 없음: `CONTRIBUTION_INPUT_FAILED`, `errorReason=INVALID_BRANCH`
- 일반 명령어 정답: 성공 횟수 증가 후 `SCORE_UPDATE`
- 일반 명령어 오타: `CONTRIBUTION_INPUT_FAILED`, `errorReason=WRONG_COMMAND`

switch도 타이핑 명령어이므로 DB command text와 입력 text가 정확히 일치해야 한다. 성공한 switch 명령어는 중복 입력 방지를 위해 `SWITCHED` 상태로 저장하지만, 점수와 진행도에는 반영하지 않는다.

`SCORE_UPDATE.scores`에는 항상 CAT 항목을 포함한다.
기여도 분모는 점수 대상 명령어의 현재 처리 수(`CLEARED + CAT expired`) 기준으로 계산한다.
`SCORE_UPDATE.progress`는 switch를 제외한 점수 대상 명령어 기준으로 계산한다.
일반 명령어 성공 시 점수 대상 `CLEARED` 명령어 수는 Redis hash scan 비용을 줄이기 위해 한 번만 조회하고, 점수와 진행도 계산에 함께 사용한다.
`SCORE_UPDATE`는 단일 명령어 delta가 아니라 성공 처리 직후 Redis에서 다시 읽은 세션 최신 스냅샷이다. 서로 다른 명령어가 동시에 성공하면 각 이벤트의 `commandSequence`는 해당 성공 명령어를 나타내고, `scores`/`progress`는 그 시점까지 반영된 전체 상태를 나타낸다.

## Caution

- 이번 브랜치에서는 `COMMAND_EXPIRED`, `CONTRIBUTION_GAME_END`, 결과 DB 저장, 랭킹 갱신을 구현하지 않는다.
- CAT 만료 횟수는 Redis 구조에 포함했지만 이번 브랜치에서는 증가시키지 않는다. 다음 만료 브랜치에서 `CAT` score를 증가시키면 `SCORE_UPDATE` 계산에 바로 반영된다.
- switch 성공은 명세상 `POSITION_UPDATE`만 브로드캐스트한다. 현재 구현은 같은 명령어 중복 처리를 막기 위해 해당 command를 `SWITCHED`로 저장한다.
- 명령어 상태는 `READY`, `CLEARED`, `SWITCHED`, `EXPIRED` 문자열로 저장한다. 다음 브랜치에서 만료 처리 시 동일 값을 사용해야 한다.
- switch 명령어가 오염되어 파싱 불가능한 경우 문서에 없는 `INVALID_INPUT_VALUE`를 노출하지 않고 `INVALID_COMMAND`로 처리한다.
- contribution session TTL은 장애 안전망이다. 정상 종료 브랜치가 추가되면 `CONTRIBUTION_GAME_END`에서 명시적으로 삭제하고, TTL은 비정상 종료 대비로 유지한다.

## Troubleshooting

### 1. `CONTRIBUTION_INPUT` 필수값 누락이 게임 로직까지 진입하는 문제

문제:
`ContributionInputMessage`에 Bean Validation 제약이 없고 `commandSequence`가 primitive `int`라서, payload에서 값이 누락되면 `0`으로 역직렬화되어 실제 게임 처리 로직까지 진입할 수 있었다.

원인:
WebSocket handler에서 `@Valid`를 적용하지 않았고, DTO 필드에도 `@NotNull`, `@NotBlank`, `@Min` 검증이 없었다.

해결:
`ContributionHandler`의 payload에 `@Valid`를 적용하고, `ContributionInputMessage`에 필수값 검증을 추가했다. `commandSequence`는 `Integer`로 변경해 누락과 실제 0번 명령어를 구분한다. type은 `CONTRIBUTION_INPUT` 고정값인지 검증한다.

검증:
`ContributionInputMessageTest`에서 필수값 누락, 잘못된 type, 음수 commandSequence 검증 실패를 확인한다.

### 2. 잘못된 WebSocket payload의 에러 코드가 명세와 달라지는 문제

문제:
payload 변환 실패나 validation 실패가 기여도 입력 명세의 `INVALID_REQUEST`가 아닌 다른 에러 코드로 내려갈 수 있었다.

원인:
STOMP message processing error와 `@MessageExceptionHandler`에서 validation/conversion 예외를 별도 계약 코드로 매핑하지 않았다.

해결:
`WebSocketStompErrorHandler`와 `WebSocketExceptionHandler`에서 `MethodArgumentNotValidException`, `MessageConversionException`을 `INVALID_REQUEST`로 매핑한다.

검증:
`WebSocketStompErrorHandlerTest`에서 `MessageConversionException`이 `INVALID_REQUEST` payload로 변환되는지 확인한다.

### 3. switch 명령어가 다른 유효 브랜치 입력으로 성공 처리되는 문제

문제:
`git switch feature/login` 명령어가 활성화된 상태에서 플레이어가 `git switch feature/payment`처럼 게임 내 다른 유효 브랜치를 입력해도 성공 처리될 수 있었다.

원인:
switch 입력 처리에서 입력값이 switch 형식인지와 대상 브랜치가 존재하는지만 확인하고, DB command text와 입력 text의 정확한 일치 여부를 검증하지 않았다.

해결:
switch도 타이핑 명령어로 보고 `command.text()`와 `request.inputText()`가 정확히 일치할 때만 성공 처리한다. 일치하지 않으면 `CONTRIBUTION_INPUT_FAILED`, `errorReason=WRONG_COMMAND`를 반환한다.

검증:
`ContributionGameServiceImplTest`에서 다른 유효 브랜치로 switch 입력 시 `WRONG_COMMAND`가 반환되는지 확인한다.

### 4. switch 성공이 점수와 진행도에 포함되는 문제

문제:
switch 성공을 `CLEARED`로 저장하고 success count를 증가시키면, 이후 `SCORE_UPDATE`에서 switch가 점수와 progress에 포함될 수 있었다.

원인:
일반 명령어 성공과 switch 성공이 같은 `CLEARED` 상태를 공유했고, 점수 계산도 `countScoredClearedCommands()`와 success count 기반으로 동작했다.

해결:
switch 성공은 `SWITCHED` 상태로 저장하고 success count를 증가시키지 않는다. `countScoredClearedCommands()`는 점수 대상인 `CLEARED`만 세므로 switch는 점수 분모에서 제외된다. progress total도 switch를 제외한 점수 대상 명령어 수로 계산한다.

검증:
`ContributionGameServiceImplTest`에서 switch 성공 시 `incrementSuccessCount()`가 호출되지 않고 `SWITCHED`로 저장되는지 확인한다. 일반 명령어 성공 시 progress가 switch를 제외한 기준으로 계산되는지도 확인한다.

### 5. 게임 시작 실패 시 Redis orphan session이 남는 문제

문제:
`initializeSession()` 이후 `saveGameSessionId()` 또는 후속 로직에서 예외가 발생하면 room state는 `WAITING`으로 롤백되지만 contribution Redis session 키가 남을 수 있었다.

원인:
게임 시작 실패 catch 블록에서 room state만 롤백하고 contribution session 삭제를 수행하지 않았다.

해결:
`ContributionGameRedisRepository.deleteSession(gameSessionId)`와 service 위임 메서드를 추가했다. `RoomServiceImpl.startGame()` catch 블록에서 contribution 모드인 경우 `deleteSession(gameSessionId)`를 호출한다.

검증:
`RoomServiceImplTest`에서 contribution 게임 시작 중 데이터 조회 실패 또는 닉네임 조회 실패 시 `deleteSession()`이 호출되는지 확인한다.

### 6. 입력 락이 무기한 대기할 수 있는 문제

문제:
실시간 WebSocket 입력 처리에서 `lock.lock()`을 사용하면 특정 command lock이 오래 잡힌 경우 후속 입력 스레드가 무기한 대기할 수 있었다.

원인:
락 획득 대기 시간과 lease time을 제한하지 않았다.

해결:
Redisson `tryLock(waitTime, leaseTime, TimeUnit.MILLISECONDS)`을 사용한다. 락 획득 실패는 `LOCK_ACQUISITION_FAILED`, 인터럽트는 `LOCK_INTERRUPTED`로 처리한다.

검증:
`ContributionGameServiceImplTest`에서 lock 획득 실패 시 `LOCK_ACQUISITION_FAILED`가 발생하는지 확인한다.

### 7. 문서에 없는 `INVALID_INPUT_VALUE`가 노출될 수 있는 문제

문제:
switch 명령어 파싱 실패 시 공통 에러 코드인 `INVALID_INPUT_VALUE`가 클라이언트로 노출될 수 있었다.

원인:
`parseSwitchBranch()` 내부 예외가 기여도 입력 명세의 에러 코드로 매핑되지 않았다.

해결:
switch command text가 파싱 불가능한 오염 데이터인 경우 `INVALID_COMMAND`로 처리한다. 정상 사용자 오타는 사전에 exact match 검증에서 `WRONG_COMMAND` 개인 실패 메시지로 반환된다.

검증:
switch 입력 실패 경로는 `ContributionGameServiceImplTest`의 `WRONG_COMMAND`, `INVALID_BRANCH`, `COMMAND_ALREADY_CLEARED` 케이스로 확인한다.

### 8. `SCORE_UPDATE` 의미가 delta인지 snapshot인지 모호한 문제

문제:
서로 다른 commandSequence가 동시에 성공하면 각 이벤트의 `commandSequence`는 해당 성공 명령어를 가리키지만, `scores`와 `progress`는 이미 다른 성공까지 반영된 최신 상태일 수 있다.

원인:
성공 처리 후 Redis에서 전체 세션 상태를 다시 읽어 `scores`와 `progress`를 구성한다.

해결:
`SCORE_UPDATE`를 단일 명령어 delta가 아니라 성공 처리 직후의 최신 세션 스냅샷으로 정의한다. `commandSequence`와 `winnerId`는 이번 성공 이벤트의 식별자이며, `scores`와 `progress`는 최신 전체 상태다.

검증:
동시 입력 테스트에서는 같은 commandSequence에 대해 한 명만 성공하는 것을 확인한다. 서로 다른 commandSequence 동시 성공은 이벤트 순서에 따라 최신 스냅샷이 내려갈 수 있으므로 프론트엔드는 `scores`와 `progress`를 최신 상태로 덮어쓰는 방식으로 처리한다.

### 9. contribution Redis session 키가 영구 잔존할 수 있는 문제

문제:
게임 종료 처리가 후속 브랜치로 분리되어 있어, 서버 크래시나 비정상 종료가 발생하면 `meta`, `commands`, `players`, `scores`, `positions` 키가 삭제되지 않을 수 있었다.

원인:
`initializeSession()`에서 세션 키를 생성한 뒤 TTL을 설정하지 않았다.

해결:
세션 초기화 완료 후 5개 contribution session 키 전체에 동일한 안전 TTL을 설정한다. 정상 종료 구현이 추가되면 명시 삭제를 수행하되, TTL은 장애 안전망으로 유지한다.

검증:
Repository 초기화 흐름에서 `expireSessionKeys()`가 모든 session key에 TTL을 적용한다.

### 10. 세션 검증 조건이 중복되는 문제

문제:
`findSession(request.gameSessionId())`로 조회한 session에 대해 다시 `session.gameSessionId().equals(request.gameSessionId())`를 검사하고 있었다.

원인:
세션 조회 키와 검증 대상이 동일해 해당 조건은 정상 Redis 조회 결과에서는 항상 true였다.

해결:
중복 조건을 제거하고 `roomId` 불일치만 `SESSION_MISMATCH`로 검증한다. 참가자 검증에는 요청의 `gameSessionId`를 명시적으로 전달한다.

검증:
기존 session mismatch와 참가자 검증 흐름은 service 테스트의 비즈니스 예외 케이스로 확인한다.

### 11. 일반 명령어 성공 시 `countScoredClearedCommands()`가 중복 호출되는 문제

문제:
`SCORE_UPDATE` 생성 과정에서 점수 계산과 progress 계산이 각각 점수 대상 `CLEARED` 명령어 카운트를 조회했다.

원인:
점수와 진행도 계산이 별도 메서드로 분리되어 같은 Redis hash scan 결과를 공유하지 않았다.

해결:
일반 명령어 성공 처리에서 `clearedCommandCount`를 한 번만 조회하고, `buildScores()`와 `buildProgress()`에 인자로 전달한다.

검증:
`ContributionGameServiceImplTest`에서 일반 명령어 성공 시 progress 값이 기존과 동일하게 계산되는지 확인한다.

### 12. 미인증 WebSocket 입력에서 NPE가 발생할 수 있는 문제

문제:
`ContributionHandler`가 `principal.getName()`을 바로 호출해 Principal이 없는 STOMP 메시지에서 NPE가 발생할 수 있었다.

원인:
인증 인터셉터 이후의 정상 흐름만 가정하고 handler 레벨의 방어 로직이 없었다.

해결:
Principal이 null이면 게임 입력 로직에 진입하지 않고 `AUTHENTICATION_REQUIRED` 에러를 전송한 뒤 종료한다.

검증:
미인증 요청은 `ContributionGameService.processInput()` 호출 전에 차단된다.

### 13. competitive 세션 초기화 API가 room 응답 DTO에 의존하는 문제

문제:
`ContributionGameService.initializeSession()`이 room 응답 DTO인 `CommandSetItemDto`, `ContributionPlayerDto`를 직접 받으면 room 응답 스키마 변경이 competitive 세션 초기화 API까지 흔들 수 있었다.

원인:
`CONTRIBUTION_STARTED` 응답 생성에 사용한 DTO를 세션 초기화 입력으로도 재사용했다.

해결:
competitive 도메인 전용 초기화 DTO인 `ContributionSessionCommand`, `ContributionSessionPlayer`를 추가하고, `RoomServiceImpl`에서 room 응답 DTO와 competitive 초기화 DTO를 분리해 생성한다.

검증:
competitive service 인터페이스와 구현은 더 이상 `domain.room.dto.response`를 import하지 않는다.

### 14. sessionId를 user name처럼 사용해 미인증 에러 응답을 보낼 수 있는 문제

문제:
Principal이 없는 요청에서 `sendToUser(sessionId, ...)`를 호출하면 sessionId가 실제 user destination name으로 해석되어 에러 응답 라우팅이 보장되지 않았다.

원인:
`WebSocketMessageSender.sendToUser()`는 Principal name 기반 전송 메서드인데, 미인증 세션에는 Principal name이 없다.

해결:
`WebSocketMessageSender.sendToSession()`을 추가하고, session id를 message header에 명시한 user destination 전송 경로를 분리했다. `ContributionHandler`의 principal null 분기는 이 메서드를 사용한다.

검증:
`ContributionHandlerTest`에서 Principal이 없으면 `sendToSession()`을 호출하고 게임 로직에는 진입하지 않는지 확인한다.

## Test Plan

- `./gradlew test --tests com.gitcat.letsgitit.domain.competitive.service.ContributionGameServiceImplTest`
- 일반 명령어 정답 시 `SCORE_UPDATE`와 CAT 항목 포함 확인
- switch 성공 시 `POSITION_UPDATE`와 position 갱신 확인
- switch 성공 시 점수와 진행도 미반영 확인
- 존재하지 않는 branch switch 시 개인 실패 메시지 확인
- switch 명령어가 다른 유효 브랜치로 입력되면 `WRONG_COMMAND` 확인
- 참가자가 아닌 사용자의 입력 거절 확인
- 이미 완료된 명령어 입력 시 `COMMAND_ALREADY_CLEARED` 확인
- 입력 락 획득 실패 시 `LOCK_ACQUISITION_FAILED` 확인
- `CONTRIBUTION_INPUT` 요청 필수값과 type 검증 확인
- contribution session 키 TTL 설정 확인
- Principal 없는 입력 요청 차단 확인
