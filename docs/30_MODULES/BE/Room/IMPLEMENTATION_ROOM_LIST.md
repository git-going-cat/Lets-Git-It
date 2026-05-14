# IMPLEMENTATION: 방 목록 조회 API

## Background / Context

방 목록 조회 API(`GET /api/v1/rooms?mode={mode}`)는 기존에 하드코딩된 Mock 데이터를 반환하고 있었다.  
실제 서비스에서는 현재 존재하는 방(대기 중 or 게임 중)을 실시간으로 조회해야 한다.

방 상태(현재 인원, 게임 상태 등)는 WebSocket 이벤트마다 바뀌는 실시간 데이터다.  
MySQL에 저장할 경우 WebSocket 이벤트마다 DB write가 발생하고, 조회 시점과 실제 상태 간 불일치가 발생할 수 있다.

## Decision

방 기본 정보는 **Redis Hash**(`room:{roomId}:info`)에 저장하고, 전체 방 목록 인덱스는 **Redis ZSet**(`room:list:{mode}`, score = 생성 시각)으로 관리한다. mode는 `CONTRIBUTION` 또는 `COOP`으로 ZSet을 분리하여 관리한다.

목록 조회 시 ZSet에서 roomId 전체를 가져온 뒤, 각 Hash를 읽어 `RoomCache`로 조립한다.  
mode 필터(`ALL` / `CONTRIBUTION` / `COOP`)는 Java 스트림에서 처리한다.

배제한 대안:
- **MySQL 직접 조회**: 실시간 상태 변경마다 DB write 필요, 조회 부하 증가
- **ZSet member에 방 전체 정보 JSON 저장**: 부분 수정(인원 변경 등) 시 전체 JSON을 다시 써야 해서 비효율적

## Why

| 항목 | ZSet + Hash 조합 | MySQL |
|---|---|---|
| 실시간 인원/상태 변경 | `room:{roomId}:members` Hash size로 동적 계산 | UPDATE 쿼리 발생 |
| 목록 조회 | `ZRANGE` → roomId 목록 | SELECT |
| 생성 시각 순 정렬 | ZSet score로 자동 정렬 | ORDER BY 필요 |
| 방 삭제 | `ZREM` + `DEL` (Lua Script 원자적 실행) | DELETE 또는 soft delete |

방 수는 최대 수십 개 수준(멀티플레이 게임 서버 특성)이므로  
ZSet 전체 조회 + Java 스트림 필터 방식의 성능 부담은 무시할 수 있다.

## Caution

- **방 생성 API 선행 필수**: 이 조회 API는 Redis에 방 데이터가 존재한다는 전제로 동작한다.  
  방 생성 시 반드시 아래 두 명령을 원자적으로 수행해야 한다:
  - `ZADD room:list:{mode} {생성timestamp} {roomId}`
  - `HMSET room:{roomId}:info {필드들}`

- **Hash 필드 명세**: `toCache()` 변환 메서드가 아래 필드명에 의존한다.  
  방 생성 시 저장 키 이름이 달라지면 `null` 변환 발생.

  | 필드명 | 타입 | 비고 |
  |---|---|---|
  | `title` | String | |
  | `mode` | String | `CONTRIBUTION` 또는 `COOP` |
  | `maxPlayers` | Integer | |
  | `hasPassword` | Boolean | |
  | `roomState` | String | `WAITING` 또는 `IN_GAME` |
  | `selectedMapId` | String (UUID) | CONTRIBUTION이면 필드 없음 |
  | `selectedMapName` | String | CONTRIBUTION이면 필드 없음 |
  | `selectedMapDifficulty` | Integer | CONTRIBUTION이면 필드 없음 |

- **잘못된 mode 값**: `?mode=INVALID`처럼 enum에 없는 값이 오면 Spring이 `MethodArgumentTypeMismatchException`을 던진다.  
  `GlobalExceptionHandler`가 `INVALID_TYPE_VALUE (400)`으로 처리한다.

- **Redis 직렬화**: `gameRedisTemplate`은 `GenericJackson2JsonRedisSerializer` + `activateDefaultTyping`을 사용한다.  
  Hash 필드 값을 읽을 때 Java 타입으로 역직렬화된다 (String → String, Integer → Integer, Boolean → Boolean).  
  방 생성 시 **동일한 `gameRedisTemplate`으로 저장**해야 타입이 일치한다.  
  (`StringRedisTemplate`처럼 plain String으로 저장 시 역직렬화 오류 발생)

## Test Plan

- `mode=ALL` 요청 시 CONTRIBUTION, COOP 방 모두 반환되는지 확인
- `mode=CONTRIBUTION` 요청 시 CONTRIBUTION 방만 반환되는지 확인
- `mode=COOP` 요청 시 COOP 방만 반환되고, `selectedMap`에 mapId/mapName/difficulty가 포함되는지 확인
- Redis에 방이 없을 때 빈 배열(`"rooms": []`) 반환 확인
- `?mode=INVALID` 요청 시 400 `INVALID_TYPE_VALUE` 응답 확인
- ZSet에 roomId는 있지만 해당 Hash가 없는(유령 키) 경우 해당 방은 목록에서 제외되는지 확인 (`toCache()` null 방어)