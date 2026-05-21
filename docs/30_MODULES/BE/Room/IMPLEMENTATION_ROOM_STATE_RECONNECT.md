# IMPLEMENTATION_ROOM_STATE_RECONNECT

## Background / Context

멀티 방 화면은 WebSocket 재연결 직후 현재 방 상태를 다시 받아야 대기실을 복원할 수 있다.

`WEBSOCKET_API_V3.md`의 `4-0. ROOM_STATE`는 `/topic/room/{roomId}` 구독 직후 서버가 현재 방 상태를 전송하고, REST fallback으로도 같은 상태를 조회할 수 있어야 한다고 정의한다. 기존 구현에는 모드별 `/contribution/state`, `/coop/state` 조회 API는 있었지만, 공통 `/{roomId}/state` API와 구독 직후 자동 전송 흐름, `CONTRIBUTION_ROOM_STATE` / `COOP_ROOM_STATE` 타입 필드가 없었다.

## Decision

공통 상태 조회는 `RoomService.getRoomState(memberId, roomId)`에 추가했다.

- Redis의 `room:{roomId}:info`와 `room:{roomId}:members`를 source of truth로 사용한다.
- 요청자가 해당 방 멤버인지 검증한다. 이때 기존 room 흐름과 동일한 `RoomMemberStateRecoveryService.ensureMemberInRoom()` 경로로 `member:{memberId}:room` 매핑 기준 정합성 복구를 먼저 시도한다.
- 복구 후에도 해당 방 멤버로 확인되지 않으면 `PLAYER_NOT_IN_ROOM`을 반환한다.
- `mode=CONTRIBUTION`이면 `ContributionRoomStateResponse`를 반환하고 `type`은 `CONTRIBUTION_ROOM_STATE`로 고정한다.
- `mode=COOP`이면 `CoopRoomStateResponse`를 반환하고 `type`은 `COOP_ROOM_STATE`로 고정한다.
- COOP의 `selectedMap`은 Redis에 저장된 `selectedMapId`, `selectedMapName`, `selectedMapDifficulty`를 사용해 조립한다.
- `currentPlayers`는 Redis raw hash 크기가 아니라 실제 응답에 포함되는 `PlayerInfoDto` 변환 결과 크기를 사용한다.

REST fallback은 기존 prefix 정책에 맞춰 `GET /api/v1/rooms/{roomId}/state`로 구현했다. 기존 모드별 API는 호환성을 위해 유지했다.

구독 직후 자동 전송은 `SessionSubscribeEvent` 리스너로 구현했다.

- destination이 정확히 `/topic/room/{roomId}`인 SUBSCRIBE만 처리한다.
- STOMP Principal의 memberId로 `getRoomState`를 호출한다.
- 조회된 ROOM_STATE payload를 구독자 본인에게 `/user/queue/private`로 유니캐스트한다.
- 조회 실패는 구독 자체를 깨지 않도록 처리하되, 구독자 본인에게 기존 WebSocket `ERROR` 포맷으로 유니캐스트한다.
  - `BusinessException`: 해당 `ErrorCode`를 그대로 전송한다.
  - 그 외 예외: `INTERNAL_SERVER_ERROR`를 전송한다.

## Why

`@SubscribeMapping`은 일반적으로 application destination에 대한 직접 응답에 적합하고, 현재 클라이언트 명세의 구독 경로는 broker destination인 `/topic/room/{roomId}`다. 그래서 기존 broker 구독 경로를 바꾸지 않고 `SessionSubscribeEvent`에서 최소 변경으로 연결했다.

다만 ROOM_STATE는 멤버 입장/퇴장 이벤트가 아니라 재연결 클라이언트의 화면 복원용 스냅샷이다. `/topic/room/{roomId}`로 브로드캐스트하면 정상 접속 중인 기존 멤버들도 불필요하게 상태 스냅샷을 받는다. 따라서 `/topic/room/{roomId}` 구독은 트리거로만 사용하고, payload는 `sendToUser(memberId, response)`로 구독자 본인에게만 전송한다.

응답 DTO는 기존 방 정보 수정 이벤트 DTO와 분리했다. ROOM_STATE는 타입과 필드 구성이 명세상 별도 이벤트이고, 특히 `ROOM_INFO_UPDATED`와 혼동되면 재연결 처리 분기가 깨질 수 있기 때문이다.

## Caution

- ROOM_STATE는 `/user/queue/private`로만 전송된다. FE가 개인 큐를 구독하지 않으면 WebSocket ROOM_STATE를 받을 수 없고 REST fallback을 호출해야 한다.
- ROOM_STATE 조회 실패 시에도 `/user/queue/private`로 `ERROR`가 전송된다. FE는 기존 개인 에러 처리 흐름에서 `ROOM_NOT_FOUND`, `PLAYER_NOT_IN_ROOM`, `ROOM_MODE_MISMATCH`, `INTERNAL_SERVER_ERROR`를 처리하면 된다.
- Redis member hash와 member-room 매핑이 일시적으로 어긋난 경우, `member:{memberId}:room`이 현재 `roomId`를 가리키면 조회 중 자동 복구 후 ROOM_STATE를 전송한다.
- 일부 Redis member entry가 응답 DTO로 변환되지 않는 경우에도 `currentPlayers`와 `members.length`가 일치하도록 변환 결과 기준으로 계산한다.
- `/topic/room/{roomId}`에서는 `PLAYER_JOINED`, `READY_CHANGED`, `HOST_DELEGATED`, `ROOM_INFO_UPDATED` 같은 방 전체 이벤트만 기대한다.
- `IN_GAME`일 때 실제 재입장을 지원하지 않는다. 서버는 `roomState=IN_GAME`만 내려주고, 안내/이동 처리는 클라이언트가 담당한다.
- 비밀번호 원문은 응답에 포함하지 않고 `hasPassword` Boolean만 내려준다.

## Test Plan

- `RoomServiceImplTest`
  - CONTRIBUTION 방 조회 시 `CONTRIBUTION_ROOM_STATE`와 members, hasPassword, roomState 반환 확인
  - COOP 방 조회 시 `COOP_ROOM_STATE`와 selectedMap 반환 확인
  - 방에 없는 회원이면 `PLAYER_NOT_IN_ROOM` 확인
  - member-room 매핑 기준 복구가 성공하면 ROOM_STATE 반환 확인
  - `currentPlayers`가 변환된 members 배열 크기와 일치하는지 확인
- `RoomStateSubscribeEventListenerTest`
  - `/topic/room/{roomId}` 구독 시 구독자 본인에게 ROOM_STATE 유니캐스트 확인
  - ROOM_STATE 조회 실패 시 구독자 본인에게 `ERROR` 유니캐스트 확인
  - 하위 topic 구독은 무시 확인
