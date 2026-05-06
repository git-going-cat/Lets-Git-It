# Single_IMPLEMENTATION_아이템드롭및사용

## Background / Context

싱글 모드 게임에 아이템 드롭 및 사용 시스템을 추가하는 작업.  
명령어를 정답으로 맞출 때 일정 확률로 아이템이 지급되고, Alt+1/2/3으로 사용한다.  
아이템 슬롯은 3개이며 중복 보유 불가 — 각 슬롯에는 고정된 아이템 종류 하나만 들어간다.

---

## Decision

### 1. 아이템 종류 및 슬롯 매핑

```ts
// single.types.ts
export type ItemType = 'restore' | 'stash' | 'cherry-pick';
export const ITEM_SLOT_MAP = ['stash', 'cherry-pick', 'restore'] as const;
```

| 슬롯 | 키 | 아이템 | 효과 |
|------|-----|--------|------|
| 0 | Alt+1 | stash | 낙하 5초 정지 |
| 1 | Alt+2 | cherry-pick | 현재 낙하 명령어 자동 완료 |
| 2 | Alt+3 | restore | 목숨 +1 (MAX_LIVES 초과 불가) |

### 2. 아이템 드롭 (command:complete 시)

난이도별 드롭 확률로 `Math.random()`을 굴리고, 통과하면 비어 있는 슬롯 중 하나를 랜덤 선택해 채운다.  
슬롯이 모두 차 있으면 드롭 없이 소멸한다.

```ts
const DROP_RATE: Record<Difficulty, number> = { EASY: 0.4, NORMAL: 0.3, HARD: 0.2 };

// useSingleGame.handleComplete
const emptyIndices = itemSlotsRef.current
  .map((filled, i) => (!filled ? i : -1))
  .filter((i) => i !== -1);
if (emptyIndices.length > 0) {
  const slotToFill = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  setItemSlots((prev) => { const next = [...prev]; next[slotToFill] = true; return next; });
}
```

### 3. 아이템 사용 (Alt+1/2/3)

`useSingleGame` 내 `window.addEventListener('keydown', handleAltKey)`로 처리한다.  
게임이 `playing` 상태일 때만 동작하며, 해당 슬롯이 비어 있으면 무시한다.

```
Alt+1 (slot 0, stash)       → EventBus.emit('item:use', { slot: 0 }) → SingleScene 처리
Alt+2 (slot 1, cherry-pick) → activeBranch 사이드이펙트 처리 후 EventBus.emit('item:use', { slot: 1 })
Alt+3 (slot 2, restore)     → useSingleGame에서 직접 lives +1 처리 (Phaser 불필요)
```

아이템 슬롯은 사용 즉시 소비(`false`)된다.

### 4. stash 구현 (SingleScene)

`setTimeout`(wall-clock 기준)으로 5초 후 자동 재개한다.  
Phaser `time.paused = true`로 정지하면 `time.delayedCall`도 멈추므로 반드시 `window.setTimeout`을 사용한다.

```ts
// 중복 발동 방지
if (this.stashTimeoutId !== null) return;
this.tweens.pauseAll();
this.time.paused = true;
this.stashTimeoutId = setTimeout(() => {
  this.stashTimeoutId = null;
  if (!this.isGameEnded && !this.isUserPaused) {
    this.tweens.resumeAll();
    this.time.paused = false;
  }
}, 5000);
```

유저가 stash 도중 ESC로 일시정지하면 `isUserPaused = true`가 되어 5초 후에도 자동 재개하지 않는다.  
유저가 이어하기를 누르면 `handleGameResume`이 `tweens.resumeAll()`을 호출해 정상 재개된다.

`isUserPaused`는 `handleGamePause`에서 `true`, `handleGameResume`에서 `false`로 관리한다.

### 5. cherry-pick 구현 (SingleScene + useSingleGame)

**SingleScene**: 현재 `commandIndex`로 `command:complete`를 emit한다. `handleCommandComplete`가 동기적으로 호출되어 레인 클리어·MERGE 처리·다음 명령어 진행이 이루어진다.

```ts
// slot === 1
if (this.isGameEnded || this.commandIndex >= this.commandSet.length) return;
EventBus.emit('command:complete', { index: this.commandIndex });
```

**useSingleGame**: cherry-pick 사용 직전, CREATE/SWITCH 타입 명령어면 `activeBranchAtom`을 업데이트한다.  
`useSingleStore.getState().commandSet`은 항상 최신값을 반환하므로 ref 없이 직접 조회한다.

```ts
const cmd = useSingleStore.getState().commandSet[commandIndexRef.current];
if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
  const target = parseSwitchTarget(cmd.text);
  if (target) setActiveBranch(target);
}
```

### 6. commandIndexRef

`useSingleGame` 내 EventBus 핸들러(`handleComplete`, `handleMiss`)에서 `commandIndexRef.current`를 수동으로 업데이트한다.  
React 상태 업데이트는 비동기 배치이므로 atom 구독 ref만으로는 Alt 핸들러 실행 시 stale할 수 있다.

### 7. 리셋

`resetGame()`에서 `setItemSlots([false, false, false])` 호출.  
`stashTimeoutId`는 `shutdown()`과 `handleGameEnd()`에서 `clearTimeout` 후 `null`로 초기화.

---

## Why

### restore를 React에서 처리하고 Phaser에 emit하지 않는 이유

restore는 `livesAtom`만 변경하면 되고 Phaser Scene의 시각 상태와 무관하다.  
EventBus를 거치면 불필요한 왕복이 생기므로 `useSingleGame`이 직접 처리한다.

### stash에 `window.setTimeout`을 쓰는 이유

`this.time.delayedCall`은 `this.time.paused = true`이면 함께 멈춘다.  
stash 자체가 시간을 멈추는 효과이므로, 재개 트리거는 반드시 Phaser 타임라인 밖인 `setTimeout`을 사용해야 한다.

### cherry-pick에서 activeBranch를 useSingleGame이 처리하는 이유

`activeBranchAtom`은 React 상태다. SingleScene은 React 상태를 직접 쓸 수 없고 EventBus만 사용한다.  
cherry-pick의 activeBranch 사이드이펙트는 `useSingleGame`의 Alt 핸들러에서 처리하고, Phaser 측 시각 효과(lane:create, branch:switch)는 `command:complete` → `handleCommandComplete` 체인에서 처리한다.

### 슬롯당 아이템 1개(중복 불가)를 선택한 이유

중복 허용 시 카운트 뱃지 UI가 추가로 필요하고, 같은 아이템 여러 개가 쌓이면 stash가 연속으로 발동되는 등 밸런스 문제가 생긴다.  
3슬롯 = 3종류 아이템 고정 매핑이 UI·밸런스 양면에서 단순하다.

---

## Caution

- `stash` 중 유저가 ESC 일시정지 → 5초 후 stashTimeoutId 만료 → 자동 재개 안 됨 → 유저가 이어하기를 눌러야 재개된다. 이는 의도된 동작이다.
- `stash`는 중복 발동 불가다 (`stashTimeoutId !== null`이면 무시). 5초가 남아 있는 상태에서 다시 Alt+1을 눌러도 시간이 초기화되지 않는다.
- cherry-pick 사용 시 `command:complete`가 emit되어 `useSingleGame.handleComplete`도 호출된다 → `comboAtom +1`, 아이템 드롭 판정도 진행된다. 즉, cherry-pick 사용 후 또 다른 아이템을 받을 수 있다.
- cherry-pick으로 MERGE 명령어를 완료하면 `handleCommandComplete`가 MERGE 처리(레인 hide)를 수행하지만, `useCommandInput`의 MERGE 관련 로직은 실행되지 않는다. 현재 MERGE는 Phaser 측에서만 처리하므로 문제없다.
- `itemSlotsAtom`은 `[boolean, boolean, boolean]` 타입이다. 슬롯 인덱스와 아이템 종류의 매핑은 `ITEM_SLOT_MAP` 상수로만 관리한다. HUD 컴포넌트는 `ITEM_SLOT_MAP[i]`로 아이콘을 결정해야 한다.
- 드롭은 `command:complete` 시에만 발생한다. 시간 초과 miss나 cherry-pick 사용으로 완료된 명령어에서는 드롭이 없다 (cherry-pick 완료는 `command:complete`를 emit하므로 드롭 판정 대상임 — 위 Caution 참고).

---

## Test Plan

- 명령어 정답 입력 반복 → 확률적으로 슬롯이 채워지는지 확인
- 슬롯 3개 모두 찬 상태에서 정답 → 슬롯 변화 없음 확인
- Alt+1 (stash): 노드 낙하 정지 5초 후 자동 재개 확인
- Alt+1 stash 중 ESC → stash 타이머 만료 후 재개 없음 → 이어하기로 재개 확인
- Alt+1 stash 중 Alt+1 재입력 → 무시(시간 초기화 없음) 확인
- Alt+2 (cherry-pick): 현재 낙하 명령어 즉시 완료, 다음 명령어 진행 확인
- Alt+2로 CREATE 명령어 완료 → activeBranch 변경 + 레인 fade-in 확인
- Alt+3 (restore): `livesAtom +1`, MAX_LIVES 초과 안 됨 확인
- 게임 종료(game:over/game:complete) 후 stash 타이머가 재개하지 않음 확인
- game:restart 후 itemSlots 전부 false 초기화 확인
