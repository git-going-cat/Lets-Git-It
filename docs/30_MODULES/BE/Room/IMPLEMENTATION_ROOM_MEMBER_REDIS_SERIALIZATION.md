# Room Member Redis Serialization

## Background / Context
- 방 생성/입장 시 `room:{roomId}:members`와 `member:{memberId}:room`는 Lua 스크립트를 통해 저장하고 있었다.
- 같은 멤버 정보를 이후 조회/보정 로직에서는 `RedisTemplate.opsForHash()`와 `opsForValue()`로 다시 확인했다.
- 멤버 저장 경로와 조회 경로의 직렬화 방식이 달라지면, 같은 UUID 문자열이어도 Redis 내부 field 바이트가 달라져 `existsMember()`가 false로 판단될 수 있다.
- 그 상태에서 방 상태 조회의 보정 로직이 같은 플레이어를 다시 저장하면, 응답의 `members` 배열과 `currentPlayers`가 중복 집계되는 문제가 발생한다.

## Decision
- 방 멤버 해시와 멤버-방 매핑은 `gameStringRedisTemplate`으로 통일한다.
- 방 메타 정보(`room:{roomId}:info`)는 기존 `gameRedisTemplate`을 유지한다.
- 따라서 아래 경로를 문자열 템플릿 기준으로 일관되게 맞춘다.
  - `saveMemberIfNotInAnyRoom`
  - `saveMember`
  - `getMembers`
  - `getMembersCount`
  - `existsMember`
  - `findJoinedRoomId`
  - `removeMember`
  - `findAllMemberIds`
  - `deleteRoom`, `dissolveRoom`의 멤버 관련 정리
  - 방 목록 조회 시 현재 인원 집계

## Why
- 멤버 관련 키는 모두 문자열 기반 식별자(UUID 문자열, roomId 문자열)를 사용하므로 `StringRedisTemplate`이 가장 단순하고 안전하다.
- 방 정보 해시까지 전부 문자열로 바꾸지 않아도 이번 문제는 멤버 관련 키의 직렬화만 통일하면 해결된다.

## Caution
- 수정 이전에 생성된 Redis 데이터에는 이미 중복 field가 남아 있을 수 있다.
- 기존 오염 데이터는 방 재생성 또는 해당 room key 정리 전까지 응답에 영향을 줄 수 있다.

## Test Plan
- `RoomRedisRepositoryImplTest`
  - 멤버 존재 확인, 삭제, 방 해체, 현재 인원 집계 경로 검증
- `ContributionRoomServiceImplTest`
  - 방 입장/상태 조회 기본 흐름이 유지되는지 검증
