# Room Membership Consistency Recovery

## Background / Context
- Redis에 방 참여 상태를 두 곳에 나누어 저장하고 있었다.
  - `member:{memberId}:room`
  - `room:{roomId}:members`
- 정상 상태에서는 두 키가 함께 유지되어야 하지만, 한쪽만 남는 경우 API마다 서로 다른 판단을 내릴 수 있었다.
- 실제로 아래와 같은 비정합 상태가 발생하면 사용자는 모순된 응답을 경험한다.

```text
member:user123:room -> "room456"
room:room456:members -> { }   // user123 없음
```

- 이 경우 새 방 생성/중복 입장 차단은 `member:{memberId}:room`을 보고 `ALREADY_IN_ANOTHER_ROOM`을 반환하고,
  방 조회/수정/퇴장은 `room:{roomId}:members`만 보고 `PLAYER_NOT_IN_ROOM`을 반환할 수 있다.
- 핵심 문제는 `member:{memberId}:room`를 source of truth처럼 사용하면서도, 일부 API는 여전히 `room:{roomId}:members`만 단독 신뢰하고 있었다는 점이다.

## Decision
- `member:{memberId}:room`를 source of truth로 유지한다.
- 방 상태 조회, 방 정보 수정, 방 나가기에서 `room:{roomId}:members`에 멤버가 없더라도
  `member:{memberId}:room`이 현재 `roomId`를 가리키면 Redis 정합성 복구를 수행한다.
- 복구 방식은 현재 멤버 정보를 조회해 `room:{roomId}:members`에 다시 저장한 뒤 정상 흐름을 계속 진행하는 방식으로 통일한다.

## Why
- `member:{memberId}:room`은 사용자 기준 현재 소속 방을 표현하는 단일 매핑이므로, 참여 여부 판단의 기준점으로 삼기 적절하다.
- 조회/수정/퇴장 API에서 자동 복구를 수행하면 비정합 상태가 남아 있어도 사용자가 방에서 빠져나오지 못하거나 조회가 막히는 문제를 줄일 수 있다.
- 별도 관리자 개입 없이 요청 처리 중 자동 치유가 가능하다.

## Caution
- 복구는 `member:{memberId}:room == roomId`인 경우에만 수행해야 한다.
- 다른 방을 가리키거나 매핑 자체가 없으면 기존대로 `PLAYER_NOT_IN_ROOM`을 반환해야 한다.
- 복구 시 호스트 여부는 `room:{roomId}:info.hostMemberId`를 기준으로 다시 계산해야 한다.

 - è¹‚ë“¦ëŽ„ì‹œ ì›ë³¸ `isReady` ìƒíƒœëŠ” Redisì—ì„œ ë³„ë„ë¡œ ë³µêµ¬í•  ìˆ˜ ì—†ì–´ `false`ë¡œ ì´ˆê¸°í™”ëœë‹¤.

## Affected APIs
- `RoomStateService.getCompetitiveRoomState()`
- `RoomStateService.getCooperativeRoomState()`
- `RoomService.updateRoomInfo()`
- `RoomService.leaveRoom()`

## Logging
- 정합성 복구가 발생하면 운영 추적을 위해 경고 로그를 남긴다.

```java
log.warn("Redis 정합성 복구 발생 - memberId: {}, roomId: {}, 복구된 키: room:{}:members",
    memberId, roomId, roomId);
```

## Test Plan
- `member:{memberId}:room`만 존재하고 `room:{roomId}:members`에 멤버가 없을 때 방 조회가 성공하는지 확인
- 같은 상태에서 방 정보 수정이 정상 동작하는지 확인
- 같은 상태에서 방 나가기가 성공하는지 확인
- 정합성 복구 시 경고 로그가 남는지 확인
