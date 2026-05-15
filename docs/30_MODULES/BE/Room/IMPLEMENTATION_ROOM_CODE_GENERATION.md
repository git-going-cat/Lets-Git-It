# IMPLEMENTATION_ROOM_CODE_GENERATION

## Background / Context

멀티플레이 방은 사용자가 직접 입력하거나 공유할 수 있는 6자리 방 코드가 필요하다.
이 코드는 영어 대문자와 숫자가 섞인 형태여야 하며, 기존 방 코드와 충돌하지 않도록 유일해야 한다.

단순 난수 문자열 생성만 `global`에 두면 재사용은 가능하지만, 유일성 검증은 저장소 상태를 알아야 하므로 room 생성 서비스 책임이 별도로 필요했다.

## Decision

### 1. 난수 문자열 생성은 `global.util.RandomCodeUtil` 재사용

인증 코드와 마찬가지로 실제 랜덤 문자열 생성 자체는 공통 유틸을 사용한다.
room 도메인은 길이, 재시도 횟수, 문자셋을 `RoomCodeGenerator` 내부 상수로 둔다.

### 2. 유니크 검증과 재생성은 생성 서비스에서 처리

`domain.room.service.RoomCodeGenerator`는 순수하게 랜덤 문자열 생성만 담당한다.
실제 유니크 검증과 재시도는 `ContributionRoomServiceImpl`, `CoopRoomServiceImpl`에서 수행한다.

1. 6자리 코드 생성
2. `RoomRedisRepository.reserveRoomCode()`로 Redis `SETNX` 기반 원자 선점
3. 선점 실패 시 재생성
4. 재시도 초과 시 예외 반환

즉, "코드를 만드는 법"과 "room 저장소 기준으로 유일한지 판단하는 법"을 분리했다.

### 3. 생성 서비스는 전용 생성기를 주입받아 사용

`ContributionRoomServiceImpl`, `CoopRoomServiceImpl`은 직접 난수 알고리즘을 알지 않고 `roomCodeGenerator.generate()`를 호출한 뒤, Redis 선점과 재시도를 수행한다.

### 4. room 코드 정책은 생성기 내부 상수로 관리

`RoomCodeGenerator` 내부에 아래 상수를 둔다.

- `ROOM_CODE_LENGTH = 6`
- `ROOM_CODE_MAX_RETRY = 20`
- `ROOM_CODE_CHARS = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"`

혼동이 쉬운 `O/0`은 제외했다.

## Why

`RandomCodeUtil`만으로는 유일성을 보장할 수 없다.
유일성은 현재 존재하는 room code 인덱스를 기준으로 확인해야 하므로 repository 접근이 필요하고, 이는 생성 서비스 책임이 더 자연스럽다.

반대로 generator가 repository를 직접 알게 하면 "코드 생성기"가 저장소 책임까지 함께 가지게 된다.
현재는 generator를 순수 생성기로 두고, 중복 확인은 생성 서비스가 담당하는 편이 역할이 더 명확하다.

## Caution

- 현재 구현은 `exists` 확인이 아니라 Redis `SETNX` 기반 선점으로 경쟁 조건을 줄인다.
- `RoomRedisRepository.reserveRoomCode()`는 임시 `"RESERVED"` 값을 짧은 TTL과 함께 저장해, 중간 실패 시 room code가 영구 점유되지 않도록 한다.
- 재시도 횟수를 모두 소진해도 유효한 room code를 확보하지 못한 경우는 사용자 입력 문제가 아니라 내부 코드 생성 실패이므로 `ROOM_CODE_GENERATION_FAILED`(500)로 처리한다.
- 현재 `createContributionRoom`, `createCoopRoom`은 아직 전체 방 생성 로직이 미완성이라, 생성된 `roomCode`는 이후 저장 응답 로직에 연결해야 한다.

## Test Plan

- 동일한 코드가 존재하지 않을 때 6자리 코드가 정상 생성되는지 확인
- 이미 존재하는 코드가 나왔을 때 재생성 후 다른 코드가 반환되는지 확인
- `ROOM_CODE_CHARS` 외 문자가 포함되지 않는지 확인
- 재시도 횟수를 초과하는 충돌 상황에서 예외가 발생하는지 확인
