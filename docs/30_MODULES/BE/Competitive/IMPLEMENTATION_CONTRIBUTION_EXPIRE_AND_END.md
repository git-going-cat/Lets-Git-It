# IMPLEMENTATION_CONTRIBUTION_EXPIRE_AND_END

## Background / Context

기여도 뺏기 게임은 `CONTRIBUTION_STARTED` 이후 클라이언트 입력 없이도 서버가 명령어 만료와 게임 종료를 확정해야 한다.

이전 진행 구현은 Redis 세션 초기화, 입력 검증, `SCORE_UPDATE` / `POSITION_UPDATE`까지 처리했고, `EXPIRED` 상태와 CAT 점수 필드는 후속 만료 브랜치를 위해 남겨두었다. 이번 구현은 그 Redis 세션을 이어받아 아래 흐름을 완성한다.

- 제한 시간 내 성공 처리되지 않은 명령어를 서버 스케줄러가 만료 처리
- 만료 시 CAT 점수 증가 및 `COMMAND_EXPIRED` 또는 `CONTRIBUTION_GAME_END` 전송
- 마지막 명령어 성공 시 `SCORE_UPDATE` 뒤에 `CONTRIBUTION_GAME_END` 연속 전송
- 종료 후 세션 status를 `ENDED`로 변경하여 이후 입력을 `GAME_ALREADY_ENDED`로 거절
- 플레이어 이탈로 남은 플레이어가 1명 이하가 되면 조기 종료

## Decision

명령어 만료와 입력 성공은 모두 `ContributionGameServiceImpl`에서 같은 Redis 상태 전이와 랭킹 계산 로직을 사용한다.

### 만료 처리

`initializeSession()`이 Redis 세션을 저장한 직후 `TaskScheduler`로 점수 대상 명령어별 만료 작업을 등록한다.

- 기준 시각: `startAt`
- 간격: 서버 상수 `COMMAND_EXPIRE_INTERVAL_MS = 20000`
- 대상: 현재 합의한 이동 명령 정책에 맞춰 `switch`만 점수와 progress 대상에서 제외
- 만료 작업은 command lock을 획득한 뒤 command 상태를 다시 읽는다.
- 이미 `CLEARED` / `SWITCHED` / `EXPIRED` / `ENDED`인 경우 아무 이벤트도 보내지 않는다.

만료에 성공하면 command status를 `EXPIRED`로 저장하고 CAT score를 증가시킨다. 마지막 명령어가 아니면 `/topic/room/{roomId}/contribution`으로 `COMMAND_EXPIRED`를 전송하고, 마지막 명령어면 `CONTRIBUTION_GAME_END`만 전송한다.

### 종료 처리

종료는 Redis meta status를 `ENDED`로 바꾼다. 이후 `processInput()`의 세션 검증에서 `GAME_ALREADY_ENDED`가 발생한다.

정상 종료 payload는 다음 값을 갖는다.

- `type=CONTRIBUTION_GAME_END`
- `isSuccess=true`
- `reason=GAME_COMPLETED`
- `rankings`
- `winnerVideoTarget`

조기 종료 payload는 다음 값을 갖는다.

- `type=CONTRIBUTION_GAME_END`
- `isSuccess=false`
- `reason=PLAYER_DISCONNECTED`

### 랭킹 계산

`SCORE_UPDATE`, `COMMAND_EXPIRED`, `CONTRIBUTION_GAME_END`는 동일한 점수 계산 결과를 사용한다.

- 플레이어와 CAT(`[CAT]`)를 모두 포함한다.
- contribution 내림차순으로 정렬한다.
- contribution이 같으면 동일 순위를 부여하고 다음 순위는 건너뛴다.
- CAT이 1등이면 `winnerVideoTarget=null`이 된다.

최종 rankings는 `contribution:session:{gameSessionId}:rankings`에 JSON으로 저장한다. 이번 브랜치에서는 DB 저장과 랭킹 갱신을 하지 않지만, 다음 브랜치가 Redis에서 최종 결과를 조회할 수 있다.

### 이탈 종료와 Room 상태

REST `leaveRoom`과 WebSocket disconnect를 연결했다.

- 이탈한 플레이어는 먼저 `contribution:session:{gameSessionId}:disconnected` Redis Set에 마킹한다.
- 이탈 마킹 후 `/topic/room/{roomId}/contribution`으로 `CONTRIBUTION_PLAYER_DISCONNECTED`를 전송한다. 이 payload의 `scores` 항목에는 `disconnected=true`가 반영된다.
- `leaveRoom`에서 CONTRIBUTION + `IN_GAME` 상태이고 남은 플레이어가 1명 이하가 되면 `CONTRIBUTION_GAME_END`를 전송한다.
- WebSocket disconnect는 같은 member의 다른 WebSocket 세션이 없고, Redis joined-room이 CONTRIBUTION + `IN_GAME`일 때만 `leaveRoom`으로 연결한다.
- 조기 종료 후 room state는 `WAITING`으로 되돌린다.

입력/만료/switch 이동/이탈 종료는 모두 세션 단위 Redis lock(`lock:contribution:session:{gameSessionId}:state`)을 먼저 획득한다. 종료가 확정된 뒤 늦은 `SCORE_UPDATE`, `COMMAND_EXPIRED`, `POSITION_UPDATE`가 나가는 경합을 막기 위한 정책이다.

방을 `WAITING`으로 되돌리는 이유는 현재 Room 정책상 게임 시작 실패 롤백도 `WAITING`을 사용하고, 종료 이후 같은 방 멤버가 대기실 상태로 복구되는 흐름과 맞기 때문이다. 방에 남은 인원이 0명이면 기존 정책대로 방을 해산한다.

## Caution

- 명령어 만료 간격은 서버 상수 20초다. 현재 `CONTRIBUTION_STARTED.commandSet`에는 명령어별 제한 시간이 없으므로, 클라이언트 낙하 속도와 별도 합의가 생기면 DTO/Redis 세션에 제한 시간 필드를 추가해야 한다.
- `git switch {branch}`만 `POSITION_UPDATE` 전용으로 취급되어 점수와 progress에서 제외된다.
- 이탈 마킹된 플레이어는 contribution 세션의 players hash에 남아 있어도 이후 입력에서 `PLAYER_NOT_IN_GAME`으로 거절된다.
- 정상 종료 시 세션 키를 삭제하지 않는다. 다음 결과 저장 브랜치가 final rankings를 읽을 수 있도록 TTL 기반 Redis 보관을 유지한다.
- 조기 종료 payload는 명세의 플레이어 이탈 종료 구조에 맞춰 rankings와 winnerVideoTarget을 채우지 않는다.
- WebSocket disconnect 자동 퇴장은 같은 member의 다른 활성 세션이 없을 때만 동작한다.

## Test Plan

- 명령어 만료 시 CAT 기여도 증가 및 `COMMAND_EXPIRED` 반환
- 성공 처리된 명령어 만료 무시
- 마지막 명령어 성공 시 `SCORE_UPDATE` 이후 `CONTRIBUTION_GAME_END` 반환
- 마지막 명령어 만료 시 `CONTRIBUTION_GAME_END`만 반환
- 동점 순위 계산: 동일 순위 부여, 다음 순위 건너뜀
- CAT 1등 시 `winnerVideoTarget=null`
- 종료 이후 입력 시 `GAME_ALREADY_ENDED`
- Redis 세션 TTL 적용 키에 final rankings 키 포함
- 브랜치 이동은 `git switch {branch}`만 처리됨
- 이탈자 마킹 후 `CONTRIBUTION_PLAYER_DISCONNECTED`에 `disconnected=true` 반영

검증 명령:

```bash
./gradlew test --tests 'com.gitcat.letsgitit.domain.competitive.service.ContributionGameServiceImplTest' --tests 'com.gitcat.letsgitit.domain.competitive.repository.ContributionGameRedisRepositoryImplTest'
```
