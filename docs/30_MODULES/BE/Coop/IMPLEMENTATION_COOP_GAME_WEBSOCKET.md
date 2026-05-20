# IMPLEMENTATION: 협력 게임 WebSocket 핵심 로직

## Background / Context

협력 모드는 4명이 함께 5라운드 × 4명령어(총 20개)를 순서대로 입력해 완료하는 게임이다.  
각 라운드마다 4개 명령어를 4명에게 랜덤 배정하고, 배정 순서(order 1→2→3→4)대로 입력해야 한다.  
순서를 어긴 플레이어는 `git reset` 명령어를 타이핑해 라운드를 처음부터 재시작한다.

기존 코드에 `CoopGameService` 인터페이스와 컨트롤러 바인딩만 존재했으며,  
핵심 게임 로직(입력 검증, 라운드 진행, 결과 저장)이 전혀 구현되어 있지 않았다.

## Decision

**Redis를 게임 실시간 상태 저장소로, MySQL을 게임 결과 영구 저장소로 사용한다.**

### WebSocket 메시지 흐름

```
클라이언트 → /app/room/{roomId}/coop/input  (COOP_INPUT)
                 └→ CoopGameServiceImpl.processInput()
                        ├─ 오타 → sendToUser(COOP_INPUT_WRONG)        [개인 전송]
                        ├─ 순서오류 → send(COOP_ORDER_WRONG)          [전체 브로드캐스트]
                        └─ 정답 → send(COOP_INPUT_CORRECT)            [전체 브로드캐스트]
                               └─ 라운드 완료 → send(COOP_ROUND_REVEAL) + 3초 후 send(COOP_ROUND_ASSIGN)
                               └─ 게임 완료 → send(COOP_GAME_END)

클라이언트 → /app/room/{roomId}/coop/reset  (COOP_RESET)
                 └→ CoopGameServiceImpl.processReset()
                        ├─ 오타 → sendToUser(COOP_RESET_WRONG)        [개인 전송]
                        └─ 정답 → unblock + startRound(isReset=true)
```

### 입력 검증 순서 (오타 → 순서오류)

```java
// 1. 오타 검증 (순서 무관)
if (!request.inputText().equals(assignedCommand)) → handleInputWrong (블록 없음, 재시도 가능)

// 2. 순서 검증 (오타 없을 때만)
if (!assignedCommand.equals(expectedCommand))     → handleOrderWrong (블록 + git reset 필요)

// 3. 정답 처리
handleInputCorrect → completedCount 증가 → 라운드/게임 완료 판단
```

오타를 순서오류보다 먼저 체크하는 이유: 잘못 타이핑한 경우 블록 없이 재시도 기회를 주기 위해.  
순서오류는 팀 전체 진행을 막는 행위이므로 블록 + 리셋이 필요하지만,  
오타는 개인 피드백으로 충분하다.

### Redis 구조

| 키 | 타입 | 내용 |
|---|---|---|
| `coop:{id}:state` | Hash | round, completedCount, blocked, resetTargetId, startTime, mapId, roomId, mapName, mapDifficulty, teamName |
| `coop:{id}:players` | List | playerIds (UUID 문자열) |
| `coop:{id}:r{n}:commands` | Hash | order(1~4) → commandText |
| `coop:{id}:r{n}:assign` | Hash | playerId → assignedCommandText |
| `coop:{id}:wrong_type` | Hash | playerId → 오타 횟수 |
| `coop:{id}:wrong_order` | Hash | playerId → 순서오류 횟수 |
| `coop:room:{roomId}:session` | String | gameSessionId |

TTL: 모든 키 7200초(2시간).

### 게임 종료 시 DB 저장

```
CoopResult      : 게임 세션 메타데이터 (mapName, difficulty, teamName, elapsedTime, 총 오타/순서오류)
CoopResultMember: 플레이어별 결과 (wrongTypeCount, wrongOrderCount)
```

랭킹 계산: `(wrongTypeCount + wrongOrderCount)` 오름차순. 동점자는 같은 순위 부여.

## Why

| 항목 | 선택 | 이유 |
|---|---|---|
| 입력 동시성 제어 | Redisson 분산 락 (`coop:lock:input:{id}`) | 두 플레이어 동시 입력 시 completedCount 중복 증가 방지 |
| 리셋 동시성 제어 | 별도 락 (`coop:lock:reset:{id}`) | 입력 락과 분리해 블록 상태에서도 리셋 처리 가능 |
| 오타/순서오류 카운터 | Redis Hash `opsForHash().increment()` | 원자적 증가, 락 없이 안전 |
| 시작 시간 기준 | `initGameState` 호출 시점 | 3초 REVEAL 딜레이 포함 전체 소요 시간 측정 |
| difficulty 타입 | `int` (DB·엔티티 일치) | `CoopResult.difficulty`, `MemberCoopBestRecord.difficulty` 모두 int |
| endGame ↔ disconnect 레이스 차단 | `endGame`에서 `LOCK_DISCONNECT` 획득 + `isGameActive` 가드 | `LOCK_INPUT`과 `LOCK_DISCONNECT`는 독립 락 — disconnect 선점 시 `endGame`이 빈 상태를 읽어 빈 데이터 DB 저장 + GAME_END 중복 발송 |
| `saveRoundCommands` 원자화 | `putAll` (HMSET) | 개별 HSET 4회는 partial read 가능 — 단일 HMSET은 Redis 수준에서 원자적 |

## Caution

- **4명 고정**: `assignAndSend`에서 `List.of(1,2,3,4)` 셔플 후 `players.size()`만큼만 배정. 4명 미만이면 일부 order가 누구에게도 배정되지 않아 게임이 데드락 상태에 빠진다. 반드시 4명 입장 후 시작해야 한다.
- **REVEAL 3초 딜레이**: `startRound` 호출 후 `assignAndSend`가 3초 뒤 실행된다. 클라이언트는 ASSIGN 메시지 수신 전 입력 불가 처리 필요.
- **`gameSessionId` 역인덱스**: `coop:room:{roomId}:session` 키로 roomId → gameSessionId 조회. 게임 종료 시 `deleteRoomGameSession`으로 삭제해야 다음 게임 시작 가능.
- **리셋 후 assignments 재셔플**: 리셋 시 `startRound(isReset=true)`를 호출해 명령어 배정을 다시 셔플한다. 이전 라운드의 assignment와 다를 수 있음.
- **`mapDifficulty` Redis 저장 형식**: `String.valueOf(selectedMap.difficulty())`로 숫자 문자열 저장. `endGame`에서 `Integer.parseInt()`로 파싱.

## Test Plan

**정상 케이스**
- 오타 입력 → `COOP_INPUT_WRONG` 수신 (본인만), wrongTypeCount 증가, 재시도 가능
- 정확 입력 + 내 차례 → `COOP_INPUT_CORRECT` 브로드캐스트, sequence/round/stepInRound 값 확인
- 정확 입력 + 내 차례 아님 → `COOP_ORDER_WRONG` 브로드캐스트, 게임 블록
- 리셋 명령어 정확 입력 → 게임 언블록, 라운드 재시작 (`COOP_ROUND_REVEAL`)
- 20번째 명령어 정답 → `COOP_GAME_END` (isSuccess=true), results 배열에 랭킹 포함
- 플레이어 이탈 → `COOP_GAME_END` (isSuccess=false, reason="PLAYER_DISCONNECTED")

**에러 케이스**
- `GAME_NOT_STARTED`: 게임 세션 없음
- `LOCK_ACQUISITION_FAILED`: 분산 락 획득 실패
- `INPUT_BLOCKED`: 순서오류로 게임 블록 상태에서 추가 입력
- `RESET_NOT_REQUIRED`: 블록 상태가 아닌데 리셋 요청
- `NOT_RESET_PLAYER`: 순서오류 유발자가 아닌 플레이어가 리셋 시도

---

## Troubleshooting

### Field 'map_difficulty' doesn't have a default value (2026-05-17)

**현상**: 게임 종료 시 `coop_result` INSERT에서 `map_difficulty NOT NULL` 오류 발생.

**원인**: 머지 전 `CoopResult` 엔티티가 `@Column(name = "map_difficulty")` String 타입이었으나,  
머지 후 `@Column(name = "difficulty")` int 타입으로 변경됨.  
DB `coop_result` 테이블에 `map_difficulty` 컬럼이 NOT NULL로 남아 있었음.

**수정**: `ALTER TABLE coop_result DROP COLUMN map_difficulty;`

---

### Unknown column 'mcbr1_0.map_difficulty' in 'field list' (2026-05-17)

**현상**: 게임 시작 시 `MemberCoopBestRecordDslRepository.findBestRecordByMemberId()` 실행에서 오류 발생.

**원인**: 머지 전 `MemberCoopBestRecord` 엔티티가 `@Column(name = "map_difficulty")` String 타입이���으나,  
머지 후 `@Column(name = "difficulty")` int 타입으로 변경됨.  
DB `member_coop_best_record` 테이블에 `difficulty` 컬럼이 없었음.

**수정**: 머지로 엔티티가 DB 컬럼명(`difficulty int`)과 일치하게 변경되어 자동 해결됨.  
단, unique constraint는 `(member_id, map_name)` → `(member_id, map_name, difficulty)`로 수동 갱신 필요:
```sql
ALTER TABLE member_coop_best_record
  DROP INDEX uq_member_coop_best_record,
  ADD UNIQUE KEY uq_member_coop_best_record (member_id, map_name, difficulty);
```

---

### 게임 시작 시 전체 최고기록 조회 (2026-05-18)

**현상**: `COOP_STARTED` 응답에 포함된 `bestTime`이 다른 맵·난이도의 기록을 반환하거나, 맵 변경 후에도 이전 맵 기록이 표시됨.

**원인**: `RoomServiceImpl.startGame()`에서 `recordService.getCoopBestRecord(memberId)` — 전체 최고기록 조회 — 를 호출하고 있었다. 맵·난이도 필터가 없어 현재 맵과 무관한 기록이 반환됐다.

**수정**: `RecordService.getCoopBestRecordByMap(memberId, mapName, difficulty)` 신규 추가.  
`MemberCoopBestRecordDslRepository.findBestRecordByMemberId(memberId, mapName, difficulty)` QueryDSL 쿼리 추가.  
`startGame()`에서 맵+난이도 기준 조회로 교체.

---

### 게임 종료 시 DB 저장 실패해도 Redis 정리·클라이언트 알림 미보장 (2026-05-18)

**현상**: `endGame()`에서 `transactionTemplate.execute()`가 예외를 던지면 이후 `deleteGameState()`, `deleteRoomGameSession()`, `COOP_GAME_END` 브로드캐스트가 모두 실행되지 않아 방이 `IN_GAME` 상태로 고착됨.

**원인**: DB 저장·Redis 정리·WebSocket 송신이 단일 try 블록에 나열되어 있었고 예외 시 뒤 단계가 건너뜀.

**수정**: `transactionTemplate.execute()` 호출을 `try/catch`로 감싸 DB 저장 실패를 `log.error`로 기록 후 계속 진행.  
Redis 정리(`deleteGameState`, `deleteRoomGameSession`, `updateRoomState`) 및 `COOP_GAME_END` 브로드캐스트는 DB 성패와 무관하게 항상 실행되도록 순서 재정렬.

---

### 정상 종료 후 disconnect 이벤트로 인한 방 이중 초기화·메시지 중복 전송 (2026-05-18)

**현상**: 게임이 정상 종료(`COOP_GAME_END` 브로드캐스트)된 직후 플레이어 disconnect 이벤트가 수신되어 `COOP_GAME_END`(isSuccess=false)가 재전송되고 방 상태가 이중으로 WAITING으로 초기화됨.

**원인**: `endGame()`에서 Redis 정리 후 disconnect 이벤트가 도달하면 `isGameActive` 체크 없이 `handlePlayerDisconnect()`가 다시 종료 처리를 수행했다.

**수정**: `handlePlayerDisconnect()` 진입 시 `isGameActive(gameSessionId)` 확인 추가 — Redis 상태가 이미 삭제된 경우 조용히 return.

---

### 게임 종료 시 최고기록 미갱신·isNewRecord 응답 누락 (2026-05-18)

**현상**: 게임 클리어 후 `COOP_GAME_END` 응답에 `isNewRecord` 필드가 없고, 기록이 갱신되지 않음.

**원인**: `endGame()`의 `transactionTemplate` 블록에 최고기록 갱신 로직이 없었고, `ResultDto`에 `isNewRecord` 필드가 없었다.  
또한 `RoomServiceImpl.startGame()`에서 `RecordService.getCoopBestRecord()`를 호출해 불필요한 DB 조회가 발생하고 있었다.

**수정**:
- `RecordServiceImpl.updateCoopBestRecord(memberId, mapName, difficulty, elapsedTime, rank)` 추가 — 최초 클리어거나 기존 기록보다 빠른 경우 `MemberCoopBestRecord`를 저장·갱신하고 `true` 반환.
- `MemberCoopBestRecordJpaRepository` 신규 생성 (`JpaRepository<MemberCoopBestRecord, UUID>`).
- `endGame()` `transactionTemplate` 블록에서 플레이어별 `updateCoopBestRecord` + `addPlayTime` 호출.
- `CoopGameEndResponse.ResultDto`에 `isNewRecord: boolean` 필드 추가.
- `RoomServiceImpl.startGame()`에서 `bestCoopRecordByMap` 조회 제거 — `CoopPlayerDto`에서 `bestTime` 필드 제거.

---

### disconnect 동시성 버그 — COOP_GAME_END 중복 브로드캐스트·ghost player (2026-05-18)

**현상 1**: 두 플레이어가 동시에 disconnect되면 `COOP_GAME_END`가 두 번 브로드캐스트됨.

**원인 1**: `handlePlayerDisconnect()`가 `isGameActive` 체크와 Redis 정리 사이에 락이 없어 두 스레드가 동시에 체크를 통과.

**수정 1**: `LOCK_DISCONNECT` (`coop:lock:disconnect:{roomId}`) Redisson 락 추가. `tryLock` 실패 시 조용히 return — 먼저 획득한 스레드만 종료 처리.

**현상 2**: 게임 종료 후 방으로 복귀했을 때 이미 disconnect된 플레이어가 방 멤버로 남아있는 ghost player 발생.

**원인 2**: `leaveGameIfDisconnected()`에서 `!ROOM_STATE_IN_GAME`이면 최상단 early return — Thread A가 게임을 먼저 끝내 방 상태를 WAITING으로 바꾸면 Thread B가 early return하며 disconnect된 플레이어의 `leaveRoom`이 호출되지 않음.

**수정 2**: `leaveGameIfDisconnected()` 재구조화.
- CONTRIBUTION: 기존 동작 유지 (`isInGame`일 때만 `leaveRoom`).
- COOP: `isInGame`이면 `handlePlayerDisconnect`, 이후 `existsMember` 가드로 멤버가 남아있으면 항상 `leaveRoom` 호출.

---

### COOP 게임 시작 시 ROUND_REVEAL 누락·유령 세션 중복 전송 (2026-05-18)

**현상 1**: 일부 클라이언트가 `COOP_ROUND_REVEAL`을 수신하지 못해 첫 라운드 명령어가 표시되지 않음.

**원인 1**: `COOP_STARTED` 브로드캐스트 100ms 후 `initAndStartGame` (내부에서 `ROUND_REVEAL` 전송) 이 실행됐는데, 클라이언트가 room topic → coop topic 재구독 전환을 완료하기 전에 REVEAL이 나가 일부 클라이언트에 미도달.

**수정 1**: `initAndStartGame` 스케줄 지연을 100ms → `REVEAL_DURATION_MS`(3000ms)로 변경. `startAt = serverTime + 3000`이므로 전원이 구독 완료된 시각에 REVEAL 전송.

**현상 2**: `sendToUser()` 시 `ROUND_ASSIGN`이 동일 플레이어에게 중복 전송됨.

**원인 2**: 브라우저 새로고침 등으로 WebSocket 재연결 시 기존 세션이 `SimpUserRegistry`에 좀비 상태로 잔존. 기존 `notifyDisconnectByNewLogin()`은 HTTP 로그인 플로우에서만 호출되어 WebSocket 직접 재연결 케이스를 처리하지 못했다.

**수정 2**: `SessionConnectedEvent` 핸들러 추가 (`WebSocketEventListener`). 새 세션 연결 시 동일 멤버의 다른 세션에 `FORCE_DISCONNECT(REPLACED_BY_NEW_LOGIN)` 즉시 전송 후 레지스트리에서 제거. `WebSocketSessionRegistry.getSessionIds()` 메서드 추가.

---

### CoopInputRequest·CoopResetRequest 검증 어노테이션 누락 (2026-05-18)

**현상**: `inputText`가 null 또는 빈 문자열이어도 컨트롤러를 통과해 `NullPointerException` 또는 오동작 발생.

**원인**: `CoopInputRequest`, `CoopResetRequest` DTO에 `@NotNull`, `@NotBlank` 등 Bean Validation 어노테이션이 없었다.

**수정**: `CoopInputRequest.inputText`, `CoopResetRequest.inputText`에 `@NotBlank` 추가. `@Valid` 어노테이션은 컨트롤러 파라미터에 이미 적용되어 있었으므로 DTO 필드 어노테이션만 추가.

---

### 협력 방 팀 이름 유효성 검사 누락 (2026-05-18)

**현상**: 특수문자, 공백만으로 구성된 팀 이름이나 8자 초과 팀 이름이 DB에 저장됨.

**원인**: `CreateCoopRoomRequest`, `UpdateCoopRoomInfoRequest`의 `teamName` 필드에 형식 제약이 없었다.

**수정**: `@Pattern(regexp = "^[가-힣a-zA-Z0-9]{1,8}$")` 어노테이션 추가 — 한글·영문·숫자 1~8자만 허용.

---

### endGame-disconnect 동시 실행 레이스·Redis 원자성 결함 (2026-05-18)

**현상 1**: 20번째 정답 입력으로 `endGame()`이 실행되는 동시에 disconnect 이벤트가 발생하면 `endGame()`이 빈 Redis 상태를 읽어 빈 데이터를 DB에 저장하고 `COOP_GAME_END`가 두 번 브로드캐스트됨.

**원인 1**: `LOCK_INPUT`과 `LOCK_DISCONNECT`는 독립 락이어서 `endGame()`(LOCK_INPUT 보유)과 `handlePlayerDisconnect()`(LOCK_DISCONNECT 보유)가 동시에 실행 가능. disconnect 선점 시 Redis 정리 완료 후 `endGame()`이 빈 상태를 읽음.

**수정 1**: `endGame()`에서 로직 실행 전 `LOCK_DISCONNECT` 추가 획득 + `isGameActive` 가드 확인. `endGame()` wrapper + `endGameInternal()` private으로 분리.

**현상 2**: `saveRoundCommands()`에서 4개 명령어가 개별 `HSET`으로 저장되어 partial read 가능.

**원인 2**: `commands.forEach((order, text) -> redisTemplate.opsForHash().put(...))` — 4회 개별 호출.

**수정 2**: `HashMap`으로 집계 후 `putAll`(HMSET) 단일 호출로 원자적 저장.

**현상 3**: `unblock()`에서 `FIELD_BLOCKED`와 `FIELD_RESET_TARGET` 갱신이 2회 HSET으로 나뉘어 partial read 가능.

**수정 3**: `putAll`(HMSET)으로 두 필드를 단일 호출로 갱신. `block()`과 동일한 패턴으로 통일.