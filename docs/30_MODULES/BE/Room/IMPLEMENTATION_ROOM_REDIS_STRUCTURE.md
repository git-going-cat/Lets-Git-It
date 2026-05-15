# IMPLEMENTATION_ROOM_REDIS_STRUCTURE

## Background / Context

room 도메인은 별도 JPA Entity를 두지 않고 Redis를 source of truth로 사용한다.
따라서 방 생성, 방 목록 조회, 방 상세 조회, 방 코드 검색, 입장/퇴장, ready 변경 같은 흐름을 모두 Redis 키 구조 기준으로 설계해야 한다.

REST API 명세상 방 응답에는 아래 정보가 필요하다.

- 방 코드(`roomCode`)
- 방 메타 정보(`title`, `mode`, `roomState`, `maxPlayers`, `teamName`, `selectedMap`)
- 현재 인원 목록(`members`)
- 모드별 방 목록 조회(`ALL`, `CONTRIBUTION`, `COOP`)

이 요구사항을 기준으로 Redis 키를 역할별로 분리한다.

## Decision

### 1. 방 코드 인덱스

```text
room:code:{roomCode} -> roomId
```

예:

```text
room:code:A3F9KX -> 42
```

용도:

- 방 코드 중복 확인
- 방 코드로 방 검색
- 방 코드 입력 후 입장 처리

`existsByRoomCode()`는 이 키 존재 여부를 기준으로 판단한다.
방 생성 시에는 단순 조회 대신 `SETNX` 기반 선점(`RESERVED`)을 우선 적용하고,
방 저장 완료 후 실제 `roomId` 값으로 확정한다.

### 2. 방 메타 정보

```text
room:{roomId}:info
```

예시 저장 필드:

- `roomId`
- `roomCode`
- `title`
- `mode`
- `roomState`
- `maxPlayers`
- `hasPassword`
- `password`
- `teamName`
- `selectedMapId`
- `hostMemberId`

용도:

- 방 상세 조회
- 방 목록 응답 조립
- 방 정보 수정

### 3. 방 참가자 정보

```text
room:{roomId}:members
```

예:

```text
room:42:members
```

저장 방식:

```text
{playerId} -> JSON
```

예시 저장 필드:

- `playerId`
- `nickname`
- `characterHair`
- `characterHairColor`
- `characterBody`
- `characterEye`
- `characterOutfit`
- `characterOutfitColor`
- `isReady`
- `isHost`
- `sessionId`

용도:

- 방 상세 응답의 `members[]` 조립
- 현재 참가자 목록 조회
- 현재 인원 수 계산
- ready 상태 변경
- host 위임
- 퇴장 처리

`isMe`는 Redis에 저장하지 않고, 응답 생성 시 현재 요청자와 `memberId`를 비교해 계산한다.

`currentPlayers`는 이 Hash 크기로 계산한다.

### 4. 방 목록 인덱스

```text
room:list:{mode}
```

예:

```text
room:list:CONTRIBUTION
room:list:COOP
```

용도:

- 모드별 방 목록 조회
- `mode` 기준 목록 조회

저장 값은 `roomId` 기준으로 관리한다.

## 조회 흐름

### 방 코드 검색

1. `room:code:{roomCode}` 조회
2. `roomId` 획득
3. `room:{roomId}:info` 조회

### 방 상세 조회 / 입장 응답

1. `room:{roomId}:info` 조회
2. `room:{roomId}:members` Hash 전체 조회
3. `members[]` 조립

입장 시에는 `room:{roomId}:join-lock` Redisson 분산 락을 잡은 뒤
방 상태 확인 → 정원 확인 → 멤버 추가 순서로 처리한다.

### 방 목록 조회

1. `room:list:{mode}` 조회
2. 각 `roomId`에 대해 `room:{roomId}:info` 조회
3. 목록 응답 조립

## Why

방 코드, 방 메타, 플레이어 상태의 변경 빈도가 서로 다르기 때문에 한 키에 모두 넣지 않고 분리했다.

- 방 코드는 검색 인덱스 역할
- 방 메타는 상대적으로 변경이 적음
- 플레이어 상태는 ready, host, 입장/퇴장 등으로 자주 변경됨
- 방 목록은 `mode` 조건 조회가 자주 필요하므로 모드별 인덱스로 분리

특히 플레이어 상태를 `room:{roomId}:info` 내부에 통합하면 플레이어 한 명의 ready 변경에도 방 전체 객체를 다시 저장해야 하므로 비효율적이다.

반대로 플레이어를 `room:{roomId}:members` Hash 하나에 `playerId -> JSON`으로 저장하면,
REST API의 `members[]` 응답을 만들 때 한 번에 읽어서 바로 조립할 수 있어 구현이 단순하다.

## Caution

- 방 코드 존재 여부는 `room:{roomId}:info`가 아니라 반드시 `room:code:{roomCode}` 기준으로 확인해야 한다.
- `isMe`는 저장값이 아니라 응답 조립 시 계산값이다.
- `room:list:{mode}`를 쓰면 `ALL` 조회 시 각 모드 목록을 합쳐 조립해야 한다.
- room code 선점은 `SETNX` 기반으로 처리해 경쟁 조건을 줄인다.
- 방 삭제 시에는 `room:code`, `room:{roomId}:info`, `room:{roomId}:members`, `room:list:{mode}`를 Pipeline으로 함께 정리하는 편이 안전하다.
- `password`는 평문 저장 대신 별도 보호 방식을 적용하는 것이 안전하다.

## Test Plan

- 방 생성 시 `room:code:{roomCode}`와 `room:{roomId}:info`가 함께 저장되는지 확인
- 방 참가 시 `room:{roomId}:members` Hash에 `playerId -> JSON`이 정상 저장되는지 확인
- 방 목록 조회 시 `room:list:{mode}` 기준으로 원하는 모드만 반환되는지 확인
- `ALL` 조회 시 필요한 모드 목록을 합쳐 정상 응답되는지 확인
- 방 상세 조회 시 `room:{roomId}:members` 기준으로 `members[]`가 정상 조립되는지 확인
