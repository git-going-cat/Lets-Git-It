# IMPLEMENTATION_CONTRIBUTION_GAME_RETURN_TO_LOBBY

## Background / Context

기여도 뺏기 게임 종료 후 기존 방을 재사용하려면 게임 종료 이벤트만 보내는 것으로는 부족했다.

정상 종료에서는 `CONTRIBUTION_GAME_END(isSuccess=true)` 이후 방 상태가 대기 상태로 복구되어야 하고, 기존 멤버들은 대기방에서 다시 ready 후 새 게임을 시작할 수 있어야 한다.

비정상 종료에서는 게임 중 이탈로 남은 인원이 1명 이하가 될 때 `CONTRIBUTION_GAME_END(isSuccess=false, reason=PLAYER_DISCONNECTED)`를 보내지만, 기존 흐름은 ready 초기화가 빠져 남은 멤버가 대기방으로 돌아온 뒤 이전 ready 상태를 유지할 수 있었다.

## Decision

정상 종료는 `ContributionHandler.sendResult()`에서 브로드캐스트 payload 목록에 `ContributionGameEndMessage(isSuccess=true)`가 포함된 경우 처리한다.

- `roomService.resetRoomAfterGame(roomId)`를 먼저 호출한다.
- 방 상태를 `WAITING`으로 되돌린다.
- 방장 외 멤버 ready를 초기화한다.
- `contributionGameService.deleteSession(gameSessionId)`로 Redis 세션을 삭제한다.
- 이후 `/topic/room/{roomId}/contribution`으로 기존 payload를 브로드캐스트한다.

비정상 종료는 `RoomServiceImpl.leaveRoom()`의 CONTRIBUTION + `IN_GAME` 분기에서 남은 플레이어가 1명 이하가 된 경우 처리한다.

- `endByPlayerDisconnected()`로 조기 종료 payload를 만든다.
- 방 상태를 `WAITING`으로 되돌린다.
- 방장 외 멤버 ready를 초기화한다.
- Redis 세션을 삭제한다.
- `CONTRIBUTION_GAME_END`를 브로드캐스트한다.

## Why

방 상태와 ready 초기화를 브로드캐스트 전에 완료해야 클라이언트가 종료 이벤트 직후 대기방으로 돌아와도 최신 상태를 조회할 수 있다.

정상 종료와 비정상 종료 모두 세션을 삭제해 종료된 게임 세션이 다음 게임 입력이나 만료 처리에 재사용되지 않도록 했다.

## Caution

- 정상 종료 payload는 `SCORE_UPDATE`와 함께 여러 payload로 반환될 수 있으므로 payload 목록 전체에서 `ContributionGameEndMessage`를 찾아야 한다.
- `PLAYER_DISCONNECTED` 조기 종료는 DB 저장과 주간 Redis 랭킹 갱신을 수행하지 않는다.
- 방에 남은 인원이 0명이면 기존 정책대로 방 해산 흐름을 따른다.
- 종료 후 같은 방에서 새 게임을 시작하려면 남은 멤버가 다시 ready 해야 한다.

## Test Plan

- 마지막 명령어 성공 시 `CONTRIBUTION_GAME_END(isSuccess=true)` 브로드캐스트 전 `resetRoomAfterGame()` 호출 확인
- 정상 종료 시 `deleteSession(gameSessionId)` 호출 확인
- 게임 중 이탈 후 남은 인원이 1명 이하이면 `WAITING` 복귀, ready 초기화, 세션 삭제 확인
- `PLAYER_LEFT.roomState`가 `WAITING`으로 전달되는지 확인
- 같은 방에서 다시 ready 후 새 게임 시작 가능 여부 확인
