# IMPLEMENTATION: 게임 시작 WebSocket

## Background / Context

대기실에서 방장이 게임 시작을 트리거하면 해당 방의 모든 플레이어에게 게임 데이터를 동시에 전달해야 한다.  
모드(CONTRIBUTION / COOP)에 따라 전달 데이터가 다르고, 시작 전 여러 검증(방 존재, 방장 여부, 인원, 준비 상태)이 필요하다.

기존에 `GameStartRequest`, `ContributionStartedResponse`, `CoopStartedResponse` DTO와 `RoomWebSocketController.startGame()` 핸들러가 뼈대만 존재했다.  
`CommandService`, `CoopService`, `RecordService`, `MemberService`를 조합해 게임 데이터를 조립하는 로직과 검증 순서를 구현했다.

## Decision

`RoomWebSocketController.startGame()` → `RoomServiceImpl.startGame()` 흐름으로 검증 후 모드별 토픽에 브로드캐스트한다.

**메시지 흐름:**
1. 클라이언트(방장) → `/app/room/{roomId}/start` 발행 (`GAME_START`)
2. `RoomWebSocketController.startGame()` 수신
3. `RoomServiceImpl.startGame()` — 검증 + 데이터 조립 + 방 상태 변경
4. `WebSocketMessageSender.send(destination, payload)` — 모드별 토픽 브로드캐스트
   - CONTRIBUTION → `/topic/room/{roomId}/contribution` (`CONTRIBUTION_STARTED`)
   - COOP → `/topic/room/{roomId}/coop` (`COOP_STARTED`)

**검증 순서:**
1. 방 존재 확인 (`ROOM_NOT_FOUND`)
2. 이미 게임 중 확인 (`GAME_ALREADY_STARTED`)
3. 방장 확인 (`NOT_HOST`)
4. 멤버 목록 + 모드 조회
5. 최소 인원 확인 — CONTRIBUTION: 2명↑, COOP: 4명↑ (`NOT_ENOUGH_PLAYERS`)
6. 방장 제외 전원 준비 확인 (`NOT_ALL_READY`)
7. 닉네임 일괄 조회 (`memberService.getNicknamesByIds`)
8. 모드별 데이터 조회 (기여도는 현재 인원수에 맞는 명령어셋, 협력은 맵 그래프)
9. 모든 조회 성공 후 방 상태 `IN_GAME` 변경 + `gameSessionId` 저장

**startAt 처리:** `startAt = serverTime + 3000` — 고정 3초 딜레이로 네트워크 지연 대응

배제한 대안:
- **ACK Timeout 방식**: WebSocket(TCP)이 전달을 보장하므로 불필요. ACK 수집 로직 추가 없이 고정 딜레이로 충분.
- **방 상태를 먼저 IN_GAME으로 변경**: 명령어셋/맵 조회 실패 시 방이 IN_GAME으로 고착되는 버그 발생 → 데이터 조회 성공 후 상태 변경으로 순서 고정.
- **방장 멤버 여부 별도 검증**: 방장(`hostMemberId`)은 항상 현재 방 멤버로 보장됨(`leaveRoom`에서 removeMember → updateHostId 원자적 처리). 중복 검증 불필요.

## Why

| 항목 | 선택 | 이유 |
|------|------|------|
| 동시 시작 보장 | 고정 3초 딜레이 (`startAt`) | TCP 전달 보장으로 ACK 불필요 |
| 방 상태 변경 시점 | 모든 데이터 조회 성공 후 | 조회 실패 시 IN_GAME 고착 방지 |
| 준비 확인 | `countReadyNonHostMembers(hostId)` | 방장은 준비 버튼 없으므로 명시적 제외 필요 |
| 닉네임 출처 | `memberService.getNicknamesByIds` (DB 실시간 조회) | Redis 멤버 Hash의 nickname은 입장 시점 값으로 변경 반영 안 됨 |
| 기여도 명령어셋 | 현재 방 인원수와 `competitive_command_set.player_count` 일치 데이터만 사용 | 인원수와 맞지 않는 게임 시나리오 시작 방지 |

## Caution

- **COOP `selectedMapId` 필수**: `room:{roomId}:info` Hash에 `selectedMapId`가 없으면 `UUID.fromString(null)` → NPE → INTERNAL_SERVER_ERROR 발생. 방 생성/맵 선택 API에서 반드시 설정해야 함.
- **`countReadyNonHostMembers`**: `opsForHash().entries()`로 전체를 읽어 Java에서 필터링. 방 최대 인원이 4명이므로 성능 문제 없음.
- **CONTRIBUTION 최소 인원**: 2명 미만이면 `NOT_ENOUGH_PLAYERS`. 에러 메시지는 "협력 모드는 4명이 필요합니다"로 되어 있어 CONTRIBUTION 케이스와 불일치 — 추후 수정 필요.
- **CONTRIBUTION command set**: 현재 방 인원수와 일치하는 `player_count` 데이터가 없으면 `COMMAND_SET_NOT_FOUND`로 시작 실패. fallback은 두지 않는다.
- **gameSessionId**: 게임 시작 시 서버가 생성한 UUID. Redis `room:{roomId}:info`의 `gameSessionId` 필드에 저장. 게임 진행 중 세션 식별용.

## Test Plan

**정상 케이스**
- CONTRIBUTION: 방장 + 1명 이상 준비 → `CONTRIBUTION_STARTED` 수신, `startAt - serverTime = 3000` 확인
- COOP: 방장 + 3명 준비, 유효한 `selectedMapId` → `COOP_STARTED` 수신

**에러 케이스**
- `ROOM_NOT_FOUND`: 존재하지 않는 roomId
- `GAME_ALREADY_STARTED`: `roomState = IN_GAME`인 방
- `NOT_HOST`: 방장이 아닌 멤버가 시작 요청
- `NOT_ENOUGH_PLAYERS`: CONTRIBUTION 1명, COOP 3명 이하
- `NOT_ALL_READY`: 비호스트 멤버 중 미준비 상태 존재
- `COMMAND_SET_NOT_FOUND`: `competitive_command_set` 테이블에 현재 CONTRIBUTION 인원수와 일치하는 `player_count` 데이터 없음
- INTERNAL_SERVER_ERROR: COOP에서 `selectedMapId`가 Redis에 없거나 DB에 없는 UUID

---

## Troubleshooting

### countReadyNonHostMembers가 항상 0 반환 (MR 리뷰 수정 — 2026-05-15)

**현상**: 전원 준비 상태에서도 게임 시작 시 `NOT_ALL_READY` 에러 발생.

**원인**: `room:{roomId}:members` 해시는 `gameStringRedisTemplate`으로 JSON 문자열(`{"isReady":true,...}`)로 저장된다.
`countReadyNonHostMembers`는 `gameRedisTemplate`(Object 직렬화)으로 읽어 값이 `Map`인지 검사했으나,
실제 저장 형태가 문자열이므로 `instanceof Map` 검사가 항상 `false`였다.

```java
// Before (버그) — gameRedisTemplate 사용 + Map 캐스팅
return gameRedisTemplate.opsForHash().entries(key).entrySet().stream()
    .filter(e -> e.getValue() instanceof Map<?, ?> map && Boolean.TRUE.equals(map.get("isReady")))
    .count();

// After — gameStringRedisTemplate + JSON 파싱
return gameStringRedisTemplate.opsForHash().entries(key).entrySet().stream()
    .filter(e -> {
        try {
            return objectMapper.readTree((String) e.getValue()).path("isReady").asBoolean(false);
        } catch (Exception ex) { return false; }
    })
    .count();
```

---

### startGame 동시 요청 시 중복 시작 가능 (MR 리뷰 수정 — 2026-05-15)

**현상**: 같은 방에 `/app/room/{roomId}/start`가 동시에 도달하면 두 요청 모두 `IN_GAME` 체크를 통과,
서로 다른 `gameSessionId`/payload가 브로드캐스트되고 Redis에는 마지막 세션만 남는다.

**원인**: 상태 체크(`findRoomStateById`)와 상태 변경(`updateRoomState`)이 락 없이 분리되어 있었다.

**수정**: `leaveRoom`/`kickMember`와 동일하게 `lock:room:{roomId}` Redisson 락 적용.
락 범위를 최소화하기 위해 검증 + 상태 선점만 락 안에서 처리하고, 무거운 데이터 조회는 락 밖에서 수행.
데이터 조회 실패 시 `updateRoomState(WAITING)` 롤백 추가.

```
lock.lock() ─────────────────────────────────────
  │ GAME_ALREADY_STARTED 체크
  │ 방장·인원·준비 검증
  │ updateRoomState(IN_GAME) ← 선점
lock.unlock() ────────────────────────────────────
  commandSet / graphPicture 조회 (실패 시 → WAITING 롤백)
  saveGameSessionId
```

---

### now 측정 시점이 데이터 조회 전 (MR 리뷰 수정 — 2026-05-15)

**현상**: `startAt = now + 3000`이지만 데이터 조회에 200ms 이상 걸리면 클라이언트 수신 시점에 3초 미만만 남는다.

**원인**: `now = System.currentTimeMillis()`를 데이터 조회 전에 측정했다.

**수정**: 모드별 데이터 조회 완료 직후, `ContributionStartedResponse.of()` / `CoopStartedResponse.of()` 호출 직전으로 이동.

---

### 방 상태·모드 문자열 하드코딩 (MR 리뷰 수정 — 2026-05-15)

`"IN_GAME"`, `"WAITING"` → `RoomConstants.ROOM_STATE_IN_GAME` / `ROOM_STATE_WAITING` 상수로 교체.
`"CONTRIBUTION"`, `"COOP"` → `RoomMode.CONTRIBUTION.name()` / `RoomMode.COOP.name()`으로 교체.

---

### GameStartResult payload 타입 안정성 (MR 리뷰 수정 — 2026-05-15)

`Object payload` → `GameStartPayload` sealed interface로 변경.
`ContributionStartedResponse`, `CoopStartedResponse`가 `GameStartPayload`를 implement.
타임어택 시작 DTO 추가 시 `permits` 목록에 함께 추가 필요.


---

### 게임 종료 후 대기방 복귀 시 비방장 멤버 준비 상태 미초기화 (2026-05-18)

**현상**: 게임이 끝난 뒤 방이 WAITING 상태로 돌아왔을 때 이전 게임에서 준비했던 비방장 멤버의 `isReady`가 `true`로 남아 있어, 다음 게임 시작 시 준비 버튼을 누르지 않아도 준비된 것으로 간주됨.

**원인**: `endGame()` / `handlePlayerDisconnect()` 흐름에서 방 상태를 WAITING으로 되돌릴 때 `room:{roomId}:members` 해시의 각 멤버 `isReady` 필드를 `false`로 초기화하는 처리가 없었다.

**수정**: `RoomRedisRepository.resetAllMembersReady(roomId)` 추가.  
`room:{roomId}:members` 해시를 전체 조회 후 각 멤버 JSON의 `isReady`를 `false`로 재직렬화해 덮어쓴다.  
`RoomServiceImpl.resetRoomToWaiting()` 호출 시 `resetAllMembersReady` 함께 호출.
