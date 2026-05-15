# TROUBLESHOOTING_ROOM_CONCURRENCY

## Background / Problem

room 도메인에서 "사용자는 한 번에 하나의 방에만 참여할 수 있다"는 규칙을 적용하려고 했지만,
초기 구현은 아래 두 가지 문제를 갖고 있었다.

1. `findJoinedRoomId()`로 사전 조회만 하고, 실제 멤버 추가는 별도로 수행했다.
2. 입장 락은 `roomId` 단위라서, 서로 다른 방에 대한 동시 입장은 막지 못했다.

즉 아래 시나리오가 가능했다.

1. Thread A: 방 1 입장 검증 통과
2. Thread B: 방 2 입장 검증 통과
3. Thread A: 방 1 멤버 추가
4. Thread B: 방 2 멤버 추가

결과적으로 동일 사용자가 두 방에 동시에 들어갈 수 있었다.

## Root Cause

초기 구조는 `room:{roomId}:members` Hash만으로 현재 참여 상태를 판단했다.
이 구조에서는 "이 사용자가 지금 어느 방에 들어가 있는가"를 빠르게 단건 조회할 수 없고,
사전 조회와 실제 저장이 분리되면서 경쟁 조건이 생겼다.

## Decision

### 1. `member:{memberId}:room` 매핑을 source of truth로 추가

사용자별 현재 방 정보를 아래 키로 관리한다.

```text
member:{memberId}:room -> roomId
```

예:

```text
member:550e8400-e29b-41d4-a716-446655440000:room -> 42
```

용도:

- 사용자가 현재 어떤 방에 들어가 있는지 O(1) 조회
- 다른 방 중복 입장 방지
- 같은 방 재입장 구분

### 2. 멤버 추가는 Lua Script로 원자화

`room:{roomId}:members` Hash 저장과 `member:{memberId}:room` 저장을 분리하면
여전히 경쟁 조건이 남기 때문에, 아래 작업을 Lua Script 하나로 묶었다.

1. `member:{memberId}:room` 존재 여부 확인
2. 없으면 `member:{memberId}:room = roomId` 저장
3. `room:{roomId}:members`에 멤버 정보 저장

이 작업은 `saveMemberIfNotInAnyRoom(...)`로 노출한다.

여기서 멤버 정보는 `Map<String, Object>`를 Lua 인자에 그대로 넘기지 않고,
JSON 문자열로 직렬화해서 전달한다.

이유:

- Lua `ARGV`는 문자열 기반이라 Java `Map`을 직접 넘기면 직렬화 방식이 불명확하다.
- 일반 `saveMember(...)` 경로와 Lua 기반 `saveMemberIfNotInAnyRoom(...)` 경로의 저장 포맷을 통일할 수 있다.
- Redis에서 실제 저장되는 값을 디버깅할 때도 JSON 문자열이 더 명확하다.

성공 시:

- 현재 사용자는 어떤 방에도 들어가 있지 않았고
- 이번 방 입장/생성이 확정된다.

실패 시:

- 이미 다른 방 또는 같은 방에 참여 중인 상태다.

### 3. 생성/입장 검증은 사전 조회가 아니라 "저장 시점" 기준으로 판단

초기 방식:

1. `findJoinedRoomId()` 조회
2. 없으면 생성/입장 진행

수정 후:

1. 필요한 기본 검증 수행
2. `saveMemberIfNotInAnyRoom(...)` 호출
3. 실패하면 `ALREADY_IN_ROOM` 또는 `ALREADY_IN_ANOTHER_ROOM` 예외 처리

즉, 최종 참여 확정 시점에서 중복 참여를 막도록 바꿨다.

## Implementation

### 추가된 Redis 키

```text
member:{memberId}:room
```

### Repository 변경

- `findJoinedRoomId(String playerId)`
  - 더 이상 전체 방 스캔을 하지 않고 `member:{memberId}:room`을 직접 조회

- `saveMemberIfNotInAnyRoom(String roomId, String memberId, Map<String, Object> memberInfo)`
  - Lua Script 기반 원자 연산

- `saveMember(...)`
  - 일반 저장 경로에서도 `member:{memberId}:room` 갱신
  - 멤버 정보는 동일하게 JSON 문자열로 저장

- `removeMember(...)`
  - `room:{roomId}:members` 제거와 함께 `member:{memberId}:room` 삭제

- `deleteRoom(...)`, `dissolveRoom(...)`
  - 방 해산 시 `room:{roomId}:members`에 남아 있는 모든 멤버의 `member:{memberId}:room` 키를 함께 삭제

### Service 변경

#### `createContributionRoom`, `createCoopRoom`

초기 구현은 생성 전에 `findJoinedRoomId()`만 조회했다.
현재는 방 정보 저장 후, 방장 멤버 추가를 `saveMemberIfNotInAnyRoom(...)`로 수행한다.

실패 시:

- `ALREADY_IN_ANOTHER_ROOM`

#### `joinContributionRoom`, `joinCoopRoom`

초기 구현은 입장 전에 `findJoinedRoomId()`를 직접 조회했다.
현재는 멤버 추가를 `saveMemberIfNotInAnyRoom(...)`로 수행하고,
실패 시 현재 매핑을 다시 읽어 아래처럼 분기한다.

- 같은 방이면 `ALREADY_IN_ROOM`
- 다른 방이면 `ALREADY_IN_ANOTHER_ROOM`

### 4. 멤버 조회 시 JSON 역직렬화 처리

`room:{roomId}:members` Hash의 값은 JSON 문자열이므로,
응답 조립 시에는 이를 다시 구조화된 값으로 역직렬화해야 한다.

현재 `ContributionRoomServiceImpl`, `CoopRoomServiceImpl`은
`buildPlayerInfoDtos(...)` 내부에서 아래처럼 처리한다.

1. 값이 `Map`이면 그대로 사용
2. 값이 `String`이면 `ObjectMapper`로 JSON 역직렬화
3. 역직렬화된 필드를 읽어 `PlayerInfoDto` 조립

즉 저장 포맷은 JSON 문자열이지만, service 레벨에서는 다시 `Map`처럼 다룬다.

## Related Fixes

이번 작업과 함께 아래 정책도 같이 정리했다.

### 1. `hasPassword=false`일 때 password 저장 무시

- 방 생성 시 `hasPassword=false`면 `password` 필드를 저장하지 않는다.
- 방 수정 시 `hasPassword=false`면 `password` 필드를 Redis Hash에서 삭제한다.

이를 위해 `updateRoomInfo(...)`는 null 필드를 `HDEL` 처리하도록 수정했다.

### 2. 방 회원 여부를 host 여부보다 먼저 검증

수정 API와 상태 조회 API에서 아래 순서로 검증한다.

1. 방 존재 확인
2. 방 회원 여부 확인
3. host 여부 확인

즉 방에 없는 사용자는 `NOT_HOST`보다 먼저 `PLAYER_NOT_IN_ROOM`을 받는다.

### 3. 방 상태 조회도 회원만 가능

- `getContributionRoomInfo(...)`
- `getCoopRoomInfo(...)`

둘 다 방 회원이 아니면 `PLAYER_NOT_IN_ROOM`을 반환한다.

## Why This Works

핵심은 "현재 참여 중인 방"을 사용자 기준으로 단건 조회 가능한 키로 분리했다는 점이다.

이후 멤버 추가를 Lua Script로 원자화하면서,

- 사전 조회와 저장 사이 경쟁 조건
- 서로 다른 방에 대한 동시 입장 경쟁 조건

둘 다 줄일 수 있었다.

## Caution

- 현재 `saveMemberIfNotInAnyRoom(...)`는 `member:{memberId}:room` 존재 여부만 기준으로 판단한다.
  즉, 이 키가 현재 참여 상태의 단일 기준이다.

- 따라서 방 해산/퇴장/강퇴 시 이 키를 반드시 같이 삭제해야 한다.
  이 삭제가 누락되면 "이미 다른 방에 참여 중" 오탐이 발생한다.

- `roomId` 단위 Redisson 락은 여전히 정원 초과 방지에 필요하다.
  `member:{memberId}:room`만으로는 같은 방 동시 입장 시 정원 초과를 막지 못한다.

- `room:{roomId}:members`의 value 포맷은 이제 JSON 문자열이므로,
  이 값을 읽는 쪽에서 역직렬화 처리 없이 바로 `Map`으로 가정하면 멤버 목록 조립이 깨질 수 있다.

## Test Plan

- 같은 사용자가 동시에 두 방 입장을 시도해도 한 쪽만 성공하는지 확인
- 같은 사용자가 동시에 방 생성 + 다른 방 입장을 시도해도 한 쪽만 성공하는지 확인
- 이미 참여 중인 방에 재입장 시 `ALREADY_IN_ROOM`이 반환되는지 확인
- 다른 방 참여 중 새 방 생성 시 `ALREADY_IN_ANOTHER_ROOM`이 반환되는지 확인
- 강퇴/퇴장/방 해산 후 `member:{memberId}:room` 키가 정상 삭제되는지 확인
- `room:{roomId}:members` 값이 JSON 문자열로 저장되고, 응답 조립 시 정상 역직렬화되는지 확인
- `hasPassword=false` 수정 시 `password` 필드가 Redis Hash에서 제거되는지 확인
