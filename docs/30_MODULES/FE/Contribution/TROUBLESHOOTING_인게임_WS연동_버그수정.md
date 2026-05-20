# TROUBLESHOOTING_인게임_WS연동_버그수정

> WS 실 연동 및 QA 과정에서 발견된 기여도 뺏기 인게임 버그 모음.  
> 각 버그는 독립적이며 발생 컴포넌트 기준으로 구분한다.

---

## Bug 1 — 방으로 돌아오기 후 준비 완료가 안 눌림 (소켓 구독 해제)

### 증상

1. 기여도 뺏기 게임 진행
2. 게임 종료 → ResultModal 표시
3. "방으로" 버튼 클릭 → WaitingRoom으로 이동
4. 준비 완료 버튼 클릭 불가. WS 구독이 없는 것처럼 동작.

### 진단

`useContributionGame.ts`의 WS 구독 effect cleanup:

```ts
// Before (버그)
return () => {
  socketManager.unsubscribe(GAME_KEY);
  socketManager.unsubscribe(PRIVATE_KEY);
  setTimeout(() => {
    socketManager.disconnect();  // ← 문제
  }, 0);
};
```

`ContributionPage` 언마운트 → cleanup 실행 → `setTimeout(disconnect, 0)` 예약. 같은 이벤트 루프 안에서 WaitingRoom이 마운트되고 `useRoomSocket`이 STOMP 구독을 완료. 그 직후 setTimeout이 발화해 `socketManager.disconnect()`가 소켓 자체를 닫으면서 WaitingRoom의 모든 구독이 무효화됨.

이 패턴은 `multi/useRoomSocket`과의 컨벤션 불일치. `socketManager`는 전역 공용 자원이므로 disconnect 호출 권한이 있는 곳은 서버가 명시적으로 지시한 `FORCE_DISCONNECT` / `KICKED` 핸들러뿐이다.

### 해결

**파일: `src/features/contribution/hooks/useContributionGame.ts`**

```ts
// After
return () => {
  socketManager.unsubscribe(GAME_KEY);
  socketManager.unsubscribe(PRIVATE_KEY);
  // socketManager는 공용 자원이므로 disconnect 호출 금지.
  // 다음 페이지(WaitingRoom 등)가 같은 소켓을 이어쓴다.
};
```

### Caution

- `disconnect`가 필요한 케이스는 `FORCE_DISCONNECT`/`KICKED` 핸들러에서만 호출. `useRoomSocket`의 패턴과 동일하게 맞춤.
- cleanup에서 `setTimeout(fn, 0)` 패턴은 StrictMode 이중 발화 대응에 자주 쓰이지만, 전역 자원(socket, IndexedDB 등)에 적용하면 다음 마운트보다 늦게 발화해 상태를 파괴할 수 있음. 지역 자원(Phaser.Game 등)에만 사용할 것.

---

## Bug 2 — 백그라운드 탭에서 명령어 spawn이 멈춤

### 증상

1. 게임 진행 중 다른 탭으로 이동(탭 전환)
2. 일정 시간 후 다시 게임 탭으로 복귀
3. 이후 명령어가 더 이상 등장하지 않음. 현재 명령어를 맞춰도 다음 명령어가 생성 안 됨.

### 진단

`ContributionScene`이 look-ahead 타이머로 `this.time.delayedCall`(Phaser 내장)을 사용:

```ts
// Before (버그)
private scheduleLookAhead(): void {
  this.lookAheadTimer?.remove();
  ...
  this.lookAheadTimer = this.time.delayedCall(
    fallDurationMs * this.spawnRatio,
    () => { this.lookAheadTimer = null; this.spawnNext(); }
  );
}
```

`Phaser.Time.Clock`은 RAF(requestAnimationFrame) 기반이다. 브라우저는 hidden 탭에서 RAF를 약 1Hz로 throttling하므로, look-ahead 타이머가 사실상 1초에 한 번만 체크된다. 낙하 시간이 2~3초인 명령어의 look-ahead(50~70%)가 수 초 이상 지연되고, 그 사이에 명령어가 만료되더라도 다음 spawn이 일어나지 않아 큐가 막힌다.

### 해결

**파일: `src/features/contribution/scenes/ContributionScene.ts`**

```ts
// After
private lookAheadTimer: ReturnType<typeof setTimeout> | null = null;

private scheduleLookAhead(fallDurationMs: number): void {
  if (this.lookAheadTimer !== null) {
    clearTimeout(this.lookAheadTimer);
    this.lookAheadTimer = null;
  }
  if (this.lastSpawnedSeq + 1 > this.commandMap.size) return;
  this.lookAheadTimer = setTimeout(() => {
    this.lookAheadTimer = null;
    this.spawnNext();
  }, fallDurationMs * this.spawnRatio);
}

shutdown(): void {
  if (this.lookAheadTimer !== null) {
    clearTimeout(this.lookAheadTimer);
    this.lookAheadTimer = null;
  }
  ...
}
```

`setTimeout`은 hidden 탭에서도 wall-clock 기준으로 발화한다. Phaser의 look-ahead 예약을 browser setTimeout으로 교체함으로써 백그라운드에서도 spawn chain이 유지된다.

### Caution

- Phaser `time.delayedCall`의 hidden 탭 throttling은 Phaser 4 기준 기본 동작. `game.events.on(HIDDEN, () => game.loop.focus())`로 RAF 자체를 깨울 수 있지만, 그래도 1Hz 정도까지만 복구되어 정밀 타이밍이 필요한 곳에는 부족함.
- `setTimeout`은 최소 1ms 단위로 작동하나 hidden 탭에서 최소 1000ms 클램핑이 적용되는 브라우저도 있음 (Chrome 88+). look-ahead 비율이 충분히 크면(>1000ms) 문제없음.
- 멀티 모드는 서버가 타이밍을 관리하므로, 탭 비활성화 시 Phaser 루프가 sleep해도 괜찮다. `ContributionGameContent.tsx`에서 `game.events.on(HIDDEN, () => game.loop.focus())`를 붙여 RAF를 강제 재개하면, `setTimeout`과 함께 완전한 백그라운드 동작을 보장할 수 있다.

---

## Bug 3 — 백그라운드 탭 복귀 시 명령어가 보이지 않음

### 증상

1. 명령어 A가 화면 중간쯤 낙하 중
2. 다른 탭으로 이동
3. 다시 게임 탭으로 복귀
4. 명령어 A가 화면에 보이지 않음 (상단 밖이나 다른 위치에 있음)

### 진단

`ContributionLane`이 Phaser tween으로 y 위치를 이동:

```ts
// Before (버그)
showCommand(text: string, fallDuration: number, onTimeout: () => void): void {
  const node = this.buildNode(text);
  node.setPosition(this.laneWidth / 2, NODE.START_Y);
  this.scene.tweens.add({
    targets: node,
    y: this.canvasHeight + NODE.END_OVERSHOOT,
    duration: fallDuration,
    ease: 'Linear',
    onComplete: onTimeout,
  });
  this.add(node);
}
```

Tween도 RAF 기반. hidden 탭에서 RAF가 throttling되면 tween의 `elapsed`가 실시간 기준보다 훨씬 적게 쌓인다. 2초 낙하 명령어가 1초 뒤 탭으로 돌아와도 tween elapsed가 50ms 수준에 머물러 노드가 START_Y 근방(화면 위)에 있어 안 보인다.

### 해결

**파일: `src/features/contribution/scenes/ContributionLane.ts`**

tween 대신 `performance.now()` 기반 manual update 방식으로 교체.

```ts
interface FallingNode {
  node: Phaser.GameObjects.Container;
  spawnTime: number;       // spawn 시각 (performance.now())
  fallDurationMs: number;
  onTimeout: () => void;
  timedOut: boolean;       // 중복 onTimeout 방지
}

showCommand(text: string, fallDuration: number, onTimeout: () => void): void {
  const node = this.buildNode(text);
  node.setPosition(this.laneWidth / 2, NODE.START_Y);
  this.add(node);
  this.commandNodes.push({
    node,
    spawnTime: performance.now(),
    fallDurationMs: fallDuration,
    onTimeout,
    timedOut: false,
  });
}

// ContributionScene.update()에서 매 프레임 호출
updateNodes(): void {
  const now = performance.now();
  const totalRange = this.canvasHeight + NODE.END_OVERSHOOT - NODE.START_Y;
  for (const entry of this.commandNodes) {
    const elapsed = now - entry.spawnTime;
    const progress = Math.min(1, elapsed / entry.fallDurationMs);
    entry.node.y = NODE.START_Y + totalRange * progress;
    if (progress >= 1 && !entry.timedOut) {
      entry.timedOut = true;
      entry.onTimeout();
    }
  }
}
```

`performance.now()`는 wall-clock 기반이므로, 탭이 hidden이었던 시간도 정확하게 반영한다. 복귀 시점에 RAF가 재개되면 첫 프레임에서 실제 경과 시간에 맞는 y 위치로 즉시 그려진다.

`ContributionScene`에 `update()` 메서드 추가:

```ts
update(): void {
  this.lanes.forEach((lane) => lane.updateNodes());
}
```

### Caution

- tween 제거로 `flashSuccess`/`flashMiss`의 성공/실패 ring 애니메이션은 여전히 tween 사용. 이 부분은 즉각적 시각 피드백 용도라 wall-clock 정밀도가 불필요하여 그대로 유지.
- `timedOut` 플래그가 없으면 `progress >= 1` 이후 매 프레임마다 `onTimeout`이 호출됨. 반드시 유지.
- `flashSuccess`는 큐 head(`commandNodes.shift()`)를 제거하며, `flashMiss`도 동일. 중간 노드를 제거하는 케이스는 없어야 한다(서버가 순서대로 처리 보장).

---

## Bug 4 — 상대방 캐릭터가 기본 캐릭터로 표시됨

### 증상

- 게임 시작 후 다른 플레이어가 커스터마이즈한 캐릭터 대신 항상 fallback(기본) 캐릭터로 표시됨.

### 진단

`ContributionPlayer` 타입에 character 관련 필드가 없었다:

```ts
// Before (버그)
export interface ContributionPlayer {
  playerId: string;
  nickname: string;
  currentBranch: string;
  // character 필드 없음
}
```

`MultiPlayerCharacters`에서 다른 플레이어는 `OTHER_PLAYER_FALLBACK_ASSET`만 사용.

### 해결

**파일: `src/features/contribution/types/contribution.types.ts`**

```ts
export interface ContributionPlayer {
  playerId: string;
  nickname: string;
  currentBranch: string;
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
}
```

**파일: `src/features/multi/components/WaitingRoom.tsx`** — `CONTRIBUTION_STARTED` 핸들러에서 `currentMembers`의 character 6필드를 players 매핑에 포함.

**파일: `src/features/contribution/components/MultiPlayerCharacters.tsx`**

```ts
function toAsset(player: ContributionPlayer): CharacterAsset {
  return {
    characterHair: player.characterHair,
    characterHairColor: player.characterHairColor,
    characterBody: player.characterBody,
    characterEye: player.characterEye,
    characterOutfit: player.characterOutfit,
    characterOutfitColor: player.characterOutfitColor,
  };
}

// 렌더링
const playerAsset = player.characterBody ? toAsset(player) : OTHER_PLAYER_FALLBACK_ASSET;
const asset: CharacterAsset = isMe ? (myAsset ?? playerAsset) : playerAsset;
```

`player.characterBody`가 빈 문자열이면 fallback 사용(방어). 내 캐릭터는 `useCurrentCharacterAsset()`(authStore) 우선, 로딩 전에는 player 필드로 표시해 빈 자리 방지.

### Caution

- `WaitingRoom.tsx`의 `CONTRIBUTION_STARTED` 매핑에서 character 필드를 누락하면 모두 빈 문자열 → fallback으로 떨어짐. BE가 `CONTRIBUTION_STARTED.players[]`에 character 6필드를 포함해야 하며, 필드명은 BE 합의 기준.
- `IMPLEMENTATION_INGAME.md` Caution 항목의 "BE 합의 미완료 항목 — 다른 플레이어 캐릭터 자산 추가"가 이 수정으로 해결됨.

---

## Bug 5 — "메인으로" 클릭 시 방이 서버에 남음

### 증상

1. 게임 종료 → ResultModal 표시
2. "메인으로" 버튼 클릭 → `/home`으로 이동
3. 로비에서 방 목록 확인 시 이전 방이 여전히 존재

### 진단

`useResultModal.ts`의 `onHome()`:

```ts
// Before (버그)
const onHome = () => {
  cleanup();  // clearSession() → roomId = null
  void navigate({ to: '/home' });
};
```

`cleanup()` → `clearSession()` 호출 → Zustand store의 `roomId`가 null로 업데이트됨. React re-render에서 `useRoomExitGuard`의 `roomId` 변경 감지 effect가 발화:

```ts
// useRoomExitGuard.ts
useEffect(() => {
  hasLeftRef.current = false;
  if (leaveTimeoutRef.current !== null) {
    clearTimeout(leaveTimeoutRef.current);  // ← leave 예약 취소
    leaveTimeoutRef.current = null;
  }
}, [roomId]);
```

`roomId`가 null이 되면 leave 예약 타이머가 취소된다. 이후 컴포넌트 언마운트 시 cleanup에서 `leave(false)`를 예약하지만, 이 시점의 `leave` 클로저는 이미 `roomId = null`로 교체된 버전이라 guard(`if (roomId == null) return`)에서 조기 반환한다.

결과적으로 `DELETE /api/v1/rooms/{roomId}/leave`가 호출되지 않고 방이 서버에 남는다.

### 해결

**파일: `src/features/contribution/hooks/useResultModal.ts`**

```ts
import { leaveRoom } from '@/features/multi/api/room.api';

const onHome = () => {
  // cleanup()이 clearSession()을 호출하면 roomId가 null로 바뀌어
  // useRoomExitGuard의 leave 예약이 취소된다. 따라서 cleanup() 전에 roomId를 캡처해 직접 호출.
  if (roomId != null) {
    void leaveRoom(roomId).catch(() => {});
  }
  cleanup();
  void navigate({ to: '/home' });
};
```

`roomId`는 React 렌더 클로저에서 캡처된 값이므로, `clearSession()` 이후에도 동일 함수 스코프 내에서는 변경 전 값을 그대로 사용할 수 있다. `leaveRoom` 호출은 fire-and-forget — 실패해도 navigate는 진행한다.

`onBackToRoom()`은 플레이어가 방에 계속 남아 있는 상태이므로 `leaveRoom` 호출 불필요.

### Caution

- `useRoomExitGuard`의 `roomId` 변경 취소 로직은 "다른 방으로 이동할 때 이전 방 나가기 API를 중복 호출하지 않기 위한" 설계. 그러나 `clearSession()` 후 null로 변경되는 케이스에서도 동일하게 작동해 나가기가 누락됨. 추후 해당 guard를 `roomId → null` 변환은 예외 처리하도록 개선하면 근본적 해결 가능.
- 탭 닫기/새로고침 상태에서 ResultModal이 떠 있는 경우는 `useRoomExitGuard`의 `pagehide` + `keepalive fetch`가 처리. 이 경우는 `roomId`가 아직 유효하므로 정상 동작.

---

## Bug 6 — 카운트다운 중 플레이어 이탈 시 게임이 시작 후 멈춤

### 증상

1. 기여도 뺏기 게임 시작 (3초 카운트다운 진행 중)
2. 상대 플레이어가 게임을 나감
3. 카운트다운이 끝나고 게임이 시작됨
4. 게임 화면이 표시되지만 명령어가 나오지 않고 그대로 멈춤

### 진단

카운트다운 중 플레이어가 이탈하면 서버는 `CONTRIBUTION_GAME_END { isSuccess: false, reason: 'PLAYER_DISCONNECTED' }`를 브로드캐스트한다.

클라이언트 처리 흐름:

```
CONTRIBUTION_GAME_END 수신
  → handleContributionGameEnd()
  → setGameStatus('ended')         // ① ResultModal 조건 충족
  → setGameResult(msg)
  → contributionBus.emit('game:end')

... (얼마 후) clientStartAt 도달 ...

useContributionGame의 clientStartAt 타이머 발화
  → setGameStatus('playing')       // ② 'ended'를 'playing'으로 덮어씌움!
  → contributionBus.emit('game:start')
```

② 시점에 ResultModal이 사라지고 게임 화면으로 전환되지만, 서버는 이미 게임을 종료 처리했으므로 명령어 처리가 없어 화면이 멈춘다.

### 해결

**파일: `src/features/contribution/hooks/useContributionGame.ts`**

```ts
useEffect(() => {
  if (sessionId == null) return;
  // ...초기화 코드...

  let gameEndedEarly = false;
  const unsubGameEnd = contributionBus.subscribe('game:end', () => {
    gameEndedEarly = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  });

  const triggerStart = () => {
    if (gameEndedEarly) return;  // ← 조기 종료 시 playing으로 전환 차단
    setGameStatus('playing');
    contributionBus.emit('game:start');
  };

  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (delayMs <= 0) {
    triggerStart();
  } else {
    timerId = setTimeout(() => {
      timerId = null;
      triggerStart();
    }, delayMs);
  }

  return () => {
    if (timerId !== null) clearTimeout(timerId);
    unsubGameEnd();
    setGameStatus('idle');
  };
}, [sessionId, ...]);
```

`game:end` 버스 이벤트는 `handleContributionGameEnd`에서만 emit된다(서버 신호). 조기 종료 신호가 타이머보다 먼저 도착하면 `gameEndedEarly = true` + 타이머 즉시 취소. 타이머가 이미 발화한 경우에도 `triggerStart()` 내부에서 `gameEndedEarly` 가드로 `setGameStatus('playing')` 호출을 차단한다.

### 시나리오별 동작

| 상황 | 결과 |
|------|------|
| 카운트다운 중 `CONTRIBUTION_GAME_END` 수신 | `gameEndedEarly = true`, 타이머 즉시 취소 → ResultModal 유지 |
| 타이머 발화 후 `game:end` 도착(정상 게임 종료) | `timerId = null`이므로 `clearTimeout` no-op, `gameEndedEarly`만 true 설정 — 게임은 이미 정상 진행 중이라 문제없음 |
| 정상 게임 (이탈 없음) | `gameEndedEarly = false` → `triggerStart` 정상 실행 |

### Caution

- `unsubGameEnd()` cleanup을 effect return에 반드시 포함. 누락 시 re-mount 후 이전 구독이 남아 이중 처리될 수 있음.
- 이 버그는 "카운트다운 중 이탈" 케이스에만 재현. 게임 시작 후 이탈은 서버가 `CONTRIBUTION_PLAYER_DISCONNECTED` + (조건 충족 시) `CONTRIBUTION_GAME_END`를 순차 발송하므로 `game:end` 핸들러가 정상 처리.

---

## Bug 7 — `commandSequence` bus emit 오류로 명령어 미삭제

### 증상

- 명령어를 정확히 입력해도 화면에서 명령어 노드가 사라지지 않고 남아있음.
- 점수는 업데이트되지만 다음 명령어가 등장하지 않음.

### 진단

`contributionSocketHandlers.ts`의 `handleScoreUpdate`에서 bus emit 시 잘못된 sequence 사용:

```ts
// Before (버그)
export function handleScoreUpdate(msg: ScoreUpdateMsg, ctx: ContributionGameCtx): void {
  const nextSeq = msg.commandSequence + 1;  // 다음 명령어 seq
  ...
  contributionBus.emit('score:update', {
    commandSequence: nextSeq,  // ← 버그: 완료된 seq가 아닌 다음 seq
    ...
  });
}
```

`ContributionScene.handleScoreUpdate`는 수신된 `commandSequence`로 `commandMap`에서 완료된 명령어를 찾아 `flashSuccess()`를 호출한다:

```ts
private readonly handleScoreUpdate = ({ commandSequence }) => {
  const clearedCmd = this.commandMap.get(commandSequence);  // nextSeq로 조회 → 없음
  if (clearedCmd) this.lanes.get(clearedCmd.branchName)?.flashSuccess();  // 호출 안 됨
};
```

서버의 `commandSequence`는 "방금 완료된 명령어의 번호"인데, bus event로 내보낼 때 `+1`이 적용되어 다음 명령어 번호가 되어버렸다. Scene은 완료된 번호로 조회하므로 항상 miss.

### 해결

**파일: `src/features/contribution/handlers/contributionSocketHandlers.ts`**

```ts
// After
contributionBus.emit('score:update', {
  scores,
  progress: msg.progress,
  commandSequence: msg.commandSequence,  // 서버가 보낸 완료 seq 그대로
  winnerId: msg.winnerId,
  requestId: msg.requestId,
});
```

`nextSeq`(`msg.commandSequence + 1`)는 store/ref 갱신용(`ctx.setCurrentSeq(nextSeq)`)으로만 사용하고, bus emit에는 서버 원본값을 사용한다.

### Caution

- `commandSequence` 의미는 컨텍스트마다 다름:
  - **서버 WS payload**: 방금 완료된 명령어 번호 (1-based, cleared)
  - **store/ref `currentSeq`**: 다음에 입력해야 할 명령어 번호 (`msg.commandSequence + 1`)
  - **bus `score:update` / `command:expired`**: 완료된 명령어 번호 (서버값 그대로)
  - **Scene `commandMap.get(seq)`**: 완료된 번호로 조회
- `IMPLEMENTATION_INGAME.md` Caution의 "commandSequence 의미" 항목 참조. 변경 시 `useContributionGame.ts`와 `ContributionScene.ts` 양쪽 모두 확인 필요.

---

## 수정 파일 요약

| 파일 | 버그 | 변경 내용 |
|------|------|-----------|
| `src/features/contribution/hooks/useContributionGame.ts` | Bug 1, Bug 6 | cleanup에서 `socketManager.disconnect()` 제거; `game:end` 구독으로 카운트다운 중 조기 종료 타이머 취소 |
| `src/features/contribution/scenes/ContributionScene.ts` | Bug 2 | `time.delayedCall` → `setTimeout` 교체; `update()` 추가 |
| `src/features/contribution/scenes/ContributionLane.ts` | Bug 2, Bug 3 | tween → `FallingNode` 큐 + wall-clock manual update 교체 |
| `src/features/contribution/types/contribution.types.ts` | Bug 4 | `ContributionPlayer`에 character 6필드 추가 |
| `src/features/contribution/components/MultiPlayerCharacters.tsx` | Bug 4 | `toAsset()` 헬퍼 추가, character 필드 기반 asset 빌드 |
| `src/features/multi/components/WaitingRoom.tsx` | Bug 4 | `CONTRIBUTION_STARTED` 핸들러에서 character 필드 매핑 |
| `src/features/contribution/hooks/useResultModal.ts` | Bug 5 | `onHome()`에서 `leaveRoom(roomId)` 직접 호출 추가 |
| `src/features/contribution/handlers/contributionSocketHandlers.ts` | Bug 7 | bus emit `commandSequence`를 `nextSeq` → `msg.commandSequence`로 수정 |
