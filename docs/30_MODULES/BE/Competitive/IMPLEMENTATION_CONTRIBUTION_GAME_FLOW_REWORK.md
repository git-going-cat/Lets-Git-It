# IMPLEMENTATION_CONTRIBUTION_GAME_FLOW_REWORK

## Background / Context

기여도 뺏기 게임의 명령어 만료는 기존에 서버 `TaskScheduler`가 고정 간격으로 자동 처리했다.
이 방식은 프론트의 명령어 낙하 애니메이션과 실제 서버 만료 시점을 맞추기 어렵다.

이번 개편은 만료 트리거를 프론트의 "명령어 노드 바닥 도달" WebSocket 요청으로 변경한다.
점수 계산, 종료 확정, final rankings snapshot 저장, 결과 DB 저장 정책은 기존 구현을 유지한다.

## Decision

### 서버 자동 만료 제거

`ContributionGameServiceImpl.initializeSession()`은 Redis 세션만 초기화한다.
명령어별 `TaskScheduler` 만료 예약, `COMMAND_EXPIRE_INTERVAL_MS`, scheduler 기반 publish 흐름은 제거한다.

### 프론트 바닥 도달 요청

프론트는 명령어 노드가 바닥에 도달하면 아래 경로로 요청한다.

```text
/app/room/{roomId}/contribution/commands/expire
```

요청 payload:

```json
{
  "type": "COMMAND_EXPIRE_REQUEST",
  "requestId": "UUID",
  "gameSessionId": "UUID",
  "commandSequence": 2
}
```

서버는 `Principal`의 memberId를 사용하며 payload의 playerId는 받지 않는다.

### 검증과 동시성

만료 요청은 입력과 동일하게 세션과 참가자를 검증한다.

- 세션 없음: `GAME_NOT_STARTED`
- roomId 불일치: `SESSION_MISMATCH`
- 세션 종료: `GAME_ALREADY_ENDED`
- 요청자가 참가자가 아님: `PLAYER_NOT_IN_GAME`
- 명령어 없음: `INVALID_COMMAND`

command lock은 기존 `lock:contribution:session:{gameSessionId}:command:{commandSequence}`를 공유한다.
성공 입력과 만료 요청이 동시에 들어오면 먼저 lock을 획득해 `READY` 상태를 변경한 요청만 반영된다.

`READY` 상태의 점수 대상 명령어만 `EXPIRED`로 바꾸고 CAT 점수를 증가시킨다.
이미 `CLEARED`, `SWITCHED`, `EXPIRED` 상태면 중복 요청으로 보고 아무 이벤트도 보내지 않는다.
`switch/checkout` 명령어는 위치 이동 전용이므로 만료와 점수 대상에서 제외한다.

### 응답 계약

- 마지막 명령어가 아니면 `/topic/room/{roomId}/contribution`으로 `COMMAND_EXPIRED`를 브로드캐스트한다.
- 마지막 명령어면 `CONTRIBUTION_GAME_END`만 브로드캐스트한다.
- 마지막 명령어 성공 입력은 기존처럼 `SCORE_UPDATE` 이후 `CONTRIBUTION_GAME_END`를 연달아 브로드캐스트한다.
- 정상 종료의 final rankings 저장과 `ContributionResultSaveService` 호출은 그대로 유지한다.

### 정상 종료 결과 반영

`GAME_COMPLETED` 정상 종료가 확정되면 final rankings snapshot을 Redis 세션에 저장하고, 기존 결과 DB 저장을 먼저 수행한다.
결과 DB 저장이 성공한 경우에만 각 실제 플레이어의 이번 게임 기여도를 이번 주 기여도 랭킹 Redis에 누적한다.

- CAT은 `playerId == null`인 가상 참가자이므로 결과 DB 저장과 주간 랭킹 Redis 갱신 대상에서 제외한다.
- 기여도 0점 플레이어도 실제 참가자이면 랭킹 Redis 갱신을 호출한다. 이 경우 누적 기여도는 그대로이고 총 플레이 수만 증가한다.
- 결과 DB 저장 실패 또는 랭킹 Redis 갱신 실패는 게임 종료 브로드캐스트를 막지 않고 로그로 남긴다.
- `PLAYER_DISCONNECTED` 조기 종료는 기존 정책대로 결과 DB 저장과 주간 랭킹 Redis 갱신을 수행하지 않는다.

### commandSet 선택

`CommandService.getRandomContributionCommandSet(int playerCount)` API를 추가하고 `RoomServiceImpl.startGame()`에서 현재 방 인원수를 전달한다.

`competitive_command_set.player_count`를 기준으로 현재 인원수와 일치하는 command set만 조회한다.
일치하는 command set이 없으면 `COMMAND_SET_NOT_FOUND`로 게임 시작을 실패시킨다.
잘못된 인원수의 데이터로 게임이 시작되는 것을 막기 위해 fallback은 두지 않는다.

필수 DB 변경:

```sql
ALTER TABLE competitive_command_set
  ADD COLUMN player_count INT NULL COMMENT '기여도 모드 권장 플레이어 수';

ALTER TABLE competitive_command_set
  DROP INDEX uq_competitive_command_set;

ALTER TABLE competitive_command_set
  ADD UNIQUE KEY uq_competitive_command_set (set_number, mode, player_count);
```

기존 CONTRIBUTION 데이터는 2인/3인/4인 등 실제 게임 인원수에 맞춰 `player_count` 값을 채워야 한다.

### branchName 의미

`CONTRIBUTION_STARTED.commandSet[].branchName`은 명령어 노드를 표시할 lane, 즉 "명령어가 위치한 브랜치"다.
`initialBranch`는 게임 시작 시 모든 플레이어의 초기 위치다.

`git switch` / `git checkout` 성공 시에는 명령어 text에서 target branch를 파싱하고, `POSITION_UPDATE.branch`에 이동 후 브랜치를 담는다.
switch/checkout은 점수, progress, CAT 만료 대상에서 제외된다.

### 타이밍 정보

`commandSet[].fallDurationMs`를 렌더링 힌트로 응답에 포함한다.
현재 서버는 이 값을 기준으로 시간 검증을 하지 않는다. 최종 만료 판단은 프론트가 바닥 도달 시 발행한 `COMMAND_EXPIRE_REQUEST`를 서버가 상태 기반으로 검증하는 방식이다.

## Caution

- 서버 자동 만료 스케줄은 더 이상 존재하지 않는다. 프론트가 만료 요청을 보내지 않으면 해당 명령어는 만료되지 않는다.
- `fallDurationMs`는 검증값이 아니라 렌더링 힌트다.
- 중복 만료 요청은 no-op이며 개인 실패 메시지도 보내지 않는다.
- 결과 DB 저장이 성공한 정상 종료에 한해 실제 플레이어별 주간 Redis 랭킹을 갱신한다.
- CAT은 응답 rankings/scores에는 포함되지만 DB 결과 저장에서는 제외된다.
- CAT은 주간 Redis 랭킹 갱신에서도 제외된다.
- `competitive_command_set.player_count`가 비어 있거나 현재 인원수와 일치하는 데이터가 없으면 기여도 게임 시작은 실패한다.

## Test Plan

- 프론트 만료 요청 시 CAT 기여도가 증가하고 `COMMAND_EXPIRED`가 반환되는지 확인
- 성공 처리된 명령어에 대한 만료 요청은 CAT 증가 없이 무시되는지 확인
- 같은 명령어 만료 요청이 중복으로 들어와도 한 번만 반영되는지 확인
- 마지막 명령어 만료 요청 시 `CONTRIBUTION_GAME_END`가 반환되는지 확인
- 종료 이후 만료 요청/입력은 `GAME_ALREADY_ENDED` 정책을 따르는지 확인
- `switch/checkout`은 `POSITION_UPDATE` 처리되고 점수/만료 대상에서 제외되는지 확인
- `RoomServiceImpl`이 playerCount를 `CommandService`에 전달하는지 확인
- 정상 종료 시 실제 플레이어는 주간 Redis 랭킹에 누적되고 CAT은 제외되는지 확인
- 기여도 0점 플레이어도 총 플레이 수 갱신 대상인지 확인
- 기존 결과 저장 테스트가 그대로 통과하는지 확인

검증 명령:

```bash
./gradlew test
```
