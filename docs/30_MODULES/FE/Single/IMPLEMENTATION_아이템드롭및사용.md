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

### 2. 아이템 드롭 — 사전 배정 방식

세션 시작 시(`singleStore.setSession`) `assignItemDrops()`가 모든 명령어에 드롭 여부와 종류를 미리 결정한다.  
`Command.itemDrop?: ItemType` 필드에 저장되고, 노드가 낙하하기 전부터 아이템 노드로 시각 구분이 가능하다.

> **사전 배정 상세 구현**: `IMPLEMENTATION_게임피드백애니메이션.md` — "1. 사전 드롭 배정" 참고

`useSingleGame.handleComplete`에서 `completedCmd.itemDrop`을 확인해 획득 처리한다.

```ts
const completedCmd = useSingleStore.getState().commandSet[index];
if (completedCmd?.itemDrop) {
  const slotIndex = ITEM_SLOT_MAP.indexOf(completedCmd.itemDrop) as 0 | 1 | 2;
  if (slotIndex !== -1 && !itemSlotsRef[slotIndex]) {
    itemSlotsRef[slotIndex] = true;
    setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);
    EventBus.emit('item:acquired', { slot: slotIndex });
  }
}
```

- 슬롯이 이미 채워져 있으면 `item:acquired`를 emit하지 않는다 (노드는 아이템 노드로 보이지만 획득 없음).
- Miss 경로는 `handleComplete`를 거치지 않으므로 자동으로 드롭 없음.
- `item:acquired` 이벤트는 `HUDItemSlots`가 구독해 해당 슬롯에 팝 애니메이션을 재생한다.

### 3. 아이템 사용 (Alt+1/2/3 키보드 / HUD 버튼 클릭)

두 가지 입력 경로를 모두 지원한다.

**키보드**: `useSingleGame` 내 `window.addEventListener('keydown', handleAltKey)`로 처리.

**버튼 클릭**: `HUDItemSlots` 각 버튼의 `onClick`에서 `EventBus.emit('item:click', { slot: i })`를 emit하면, `useSingleGame`의 `handleItemClick` 핸들러가 동일한 `applyItemSlot(slot)` 함수를 호출한다.

두 경로 모두 `applyItemSlot(slotIndex)`로 수렴하며, 게임이 `playing` 상태이고 해당 슬롯이 채워져 있을 때만 동작한다. 버튼은 `disabled={!active || !isPlaying}`으로 UI에서도 차단된다.

```
Alt+1 또는 HUD 버튼 클릭 (slot 0, stash)       → EventBus.emit('item:use', { slot: 0 }) → SingleScene 처리
Alt+2 또는 HUD 버튼 클릭 (slot 1, cherry-pick) → activeBranch 사이드이펙트 처리 후 EventBus.emit('item:use', { slot: 1 })
Alt+3 또는 HUD 버튼 클릭 (slot 2, restore)     → useSingleGame에서 직접 lives +1 처리 (Phaser 불필요)
```

아이템 슬롯은 사용 즉시 소비(`false`)된다.

### 4. stash 구현 (SingleScene + StashOverlay)

Phaser `time.delayedCall`로 5초 후 자동 재개한다. 글로벌 `this.time.paused`는 건드리지 않고 점수 계산에 사용되는 `timerEvent.paused`만 개별 제어한다.

```ts
// 중복 발동 방지
if (this.stashTimeoutId !== null) return;
this.tweens.pauseAll();
if (this.timerEvent) this.timerEvent.paused = true;
this.stashTimeoutId = this.time.delayedCall(5000, () => {
  this.stashTimeoutId = null;
  if (!this.isGameEnded && !this.isUserPaused) {
    this.tweens.resumeAll();
    if (this.timerEvent) this.timerEvent.paused = false;
  }
  EventBus.emit('stash:end');
});
```

유저가 stash 도중 ESC로 일시정지하면 `handleGamePause`가 `this.time.paused = true`를 설정해 `time.delayedCall`(stash 타이머)도 함께 멈춘다. 유저가 이어하기를 누르면 `handleGameResume`이 잔여 시간만큼 stash 타이머를 자동으로 재개한다.

`handleGameResume`은 stash/cherry-pick 활성 중에는 `tweens.resumeAll()`을 호출하지 않는다. stash의 `time.delayedCall` 콜백이 완료 시 알아서 tween/timerEvent를 재개하므로 ESC 해제 시점에 노드가 떨어지지 않는다.

**Stash 조기 종료**: 명령어 성공 시 stash가 조기 종료된다.
- `SingleScene.handleCommandComplete`: `stashTimeoutId.remove()` + `tweens.resumeAll()` + `timerEvent.paused = false` + `EventBus.emit('stash:end')`.
- `StashOverlay`: `stash:end` 이벤트를 구독해 오버레이를 즉시 숨김.
- 오타(`command:wrong`)에는 반응하지 않는다 — 성공 시에만 종료.

**StashOverlay**: `item:use { slot: 0 }` 수신 시 반투명 파란 오버레이 + "STASH!" 쾅 애니메이션을 표시하고, `stash:end` 수신 시 숨긴다. SingleScene이 source of truth이며 자체 setTimeout을 사용하지 않는다 — ESC 일시정지 중에도 SingleScene 타이머와 동기화돼 STASH! 텍스트가 유지된다.  
→ 상세: `IMPLEMENTATION_게임피드백애니메이션.md` — "5. StashOverlay" 참고

### 5. cherry-pick 구현 (SingleScene + useSingleGame + CherryPickOverlay)

**SingleScene**: `CHERRY_PICK_ANIM_MS(800ms)` 후 현재 `commandIndex`로 `command:complete`를 emit한다.  
stash와 마찬가지로 `time.delayedCall` + `timerEvent.paused` 개별 제어를 사용하므로 ESC 일시정지 중 cherry-pick 타이머도 함께 멈춘다. 완료 시 `cherry-pick:end`도 emit해 오버레이와 동기화한다.

```ts
// slot === 1
if (this.isGameEnded || this.commandIndex >= this.commandSet.length) return;
if (this.cherryPickTimeoutId !== null) return; // 중복 방지
const indexAtUse = this.commandIndex;
this.tweens.pauseAll();
if (this.timerEvent) this.timerEvent.paused = true;
this.cherryPickTimeoutId = this.time.delayedCall(CHERRY_PICK_ANIM_MS, () => {
  this.cherryPickTimeoutId = null;
  if (!this.isGameEnded) {
    if (!this.isUserPaused) {
      this.tweens.resumeAll();
      if (this.timerEvent) this.timerEvent.paused = false;
    }
    EventBus.emit('command:complete', { index: indexAtUse });
  }
  EventBus.emit('cherry-pick:end');
});
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

**CherryPickOverlay**: `item:use { slot: 1 }` 수신 시 🐾 발바닥 stamp(550ms) → fade(250ms) 애니메이션을 재생한다.  
`CHERRY_PICK_ANIM_MS` 상수를 SingleScene과 공유해 타이밍 불일치를 방지한다.  
→ 상세: `IMPLEMENTATION_게임피드백애니메이션.md` — "6. CherryPickOverlay" 참고

### 6. restore 구현 (useSingleGame + RestoreOverlay)

`useSingleGame`이 `livesAtom +1`을 직접 처리한다. Phaser와 무관한 React 상태 변경이므로 EventBus를 거치지 않는다.  
단, `RestoreOverlay` 애니메이션을 트리거하기 위해 `EventBus.emit('item:use', { slot: 2 })`도 함께 emit한다.

**RestoreOverlay**: `item:use { slot: 2 }` 수신 시 ♥가 확대되며 페이드아웃하는 힐링 아우라를 700ms 재생한다.  
→ 상세: `IMPLEMENTATION_게임피드백애니메이션.md` — "7. RestoreOverlay" 참고

### 7. commandIndexRef

`useSingleGame` 내 EventBus 핸들러(`handleComplete`, `handleMiss`)에서 `commandIndexRef.current`를 수동으로 업데이트한다.  
React 상태 업데이트는 비동기 배치이므로 atom 구독 ref만으로는 Alt 핸들러 실행 시 stale할 수 있다.

### 8. 리셋

`resetGame()`에서 `setItemSlots([false, false, false])` 호출.  
`stashTimeoutId`는 `shutdown()`과 `handleGameEnd()`에서 `clearTimeout` 후 `null`로 초기화.

---

## Why

### restore를 React에서 처리하는 이유

restore는 `livesAtom`만 변경하면 되고 Phaser Scene의 시각 상태와 무관하다.  
EventBus를 거치면 불필요한 왕복이 생기므로 `useSingleGame`이 직접 처리한다.  
단, `RestoreOverlay` 애니메이션 트리거를 위해 `item:use { slot: 2 }`는 emit한다.

### stash에 `time.delayedCall` + `timerEvent.paused` 개별 제어를 쓰는 이유

이전 구현은 `setTimeout` + `this.time.paused = true`를 함께 사용했다. `this.time.paused = true`로 점수 계산에 쓰이는 `elapsedMs` 누적을 멈추고, `setTimeout`(브라우저 실시간)으로 5초를 측정하는 방식이었다.

이 조합은 두 가지 문제가 있었다:
1. **ESC 일시정지 시 stash 타이머가 계속 흐름**: `setTimeout`이 브라우저 실시간 기반이라 게임이 멈춰도 stash 5초가 째깍거리며 진행됨
2. **`StashOverlay`(자체 setTimeout)와의 동기화 불일치**: 두 setTimeout이 독립적이라 어느 한쪽이 ESC 중에도 종료되는 등 시각·로직 불일치 발생

수정안:
- 글로벌 `this.time.paused`는 ESC(`handleGamePause/Resume`)만 제어
- stash/cherry-pick은 `timerEvent.paused`만 개별 제어 → 점수 누적 정지 유지
- 5초 카운트는 `time.delayedCall` → 글로벌 `time.paused`에 묶여 ESC 시 함께 멈춤
- `stash:end` 이벤트로 SingleScene을 source of truth로 두어 StashOverlay와 동기화

### cherry-pick에서 activeBranch를 useSingleGame이 처리하는 이유

`activeBranchAtom`은 React 상태다. SingleScene은 React 상태를 직접 쓸 수 없고 EventBus만 사용한다.  
cherry-pick의 activeBranch 사이드이펙트는 `useSingleGame`의 Alt 핸들러에서 처리하고, Phaser 측 시각 효과(lane:create, branch:switch)는 `command:complete` → `handleCommandComplete` 체인에서 처리한다.

### 슬롯당 아이템 1개(중복 불가)를 선택한 이유

중복 허용 시 카운트 뱃지 UI가 추가로 필요하고, 같은 아이템 여러 개가 쌓이면 stash가 연속으로 발동되는 등 밸런스 문제가 생긴다.  
3슬롯 = 3종류 아이템 고정 매핑이 UI·밸런스 양면에서 단순하다.

---

## Caution

- `stash` 중 유저가 ESC 일시정지 → stash 타이머도 함께 멈춤 (`time.delayedCall`이 글로벌 `time.paused`에 묶여 있음) → 이어하기 시 stash 잔여 시간만큼 진행 후 자동 재개. ESC 해제 시 `handleGameResume`은 stash 활성 중이면 tween을 resume하지 않으므로 노드 낙하 재개 시점이 stash 완료 시점과 일치한다.
- `stash`는 중복 발동 불가다 (`stashTimeoutId !== null`이면 무시). 5초가 남아 있는 상태에서 다시 Alt+1을 눌러도 시간이 초기화되지 않는다.
- cherry-pick 사용 시 `command:complete`가 emit되어 `useSingleGame.handleComplete`도 호출된다 → `comboAtom +1`, 아이템 드롭 판정도 진행된다. 즉, cherry-pick 사용 후 또 다른 아이템을 받을 수 있다.
- cherry-pick으로 MERGE 명령어를 완료하면 `handleCommandComplete`가 MERGE 처리(레인 hide)를 수행하지만, `useCommandInput`의 MERGE 관련 로직은 실행되지 않는다. 현재 MERGE는 Phaser 측에서만 처리하므로 문제없다.
- `itemSlotsAtom`은 `[boolean, boolean, boolean]` 타입이다. 슬롯 인덱스와 아이템 종류의 매핑은 `ITEM_SLOT_MAP` 상수로만 관리한다. HUD 컴포넌트는 `ITEM_SLOT_MAP[i]`로 아이콘을 결정해야 한다.
- 드롭은 `handleComplete`를 거치는 경로에서만 발생한다. 시간 초과 miss는 `handleComplete`를 거치지 않으므로 아이템 노드여도 드롭되지 않는다. cherry-pick 완료는 `command:complete`를 emit하므로 `handleComplete`를 거쳐 드롭 판정 대상이 된다.

---

## Test Plan

- 명령어 정답 입력 반복 → 확률적으로 슬롯이 채워지는지 확인
- 슬롯 3개 모두 찬 상태에서 정답 → 슬롯 변화 없음 확인
- Alt+1 (stash): 노드 낙하 정지 5초 후 자동 재개 확인
- Alt+1 stash 중 ESC → STASH! 텍스트 유지 + 노드 정지 유지 → 이어하기 시 stash 잔여 시간만큼 정지 후 자동 재개 확인
- Alt+1 stash 중 ESC 해제 시 노드가 즉시 재낙하하지 않는지 확인 (stash 잔여 시간 대기)
- Alt+1 stash 중 Alt+1 재입력 → 무시(시간 초기화 없음) 확인
- Alt+2 (cherry-pick): 현재 낙하 명령어 즉시 완료, 다음 명령어 진행 확인
- Alt+2로 CREATE 명령어 완료 → activeBranch 변경 + 레인 fade-in 확인
- Alt+3 (restore): `livesAtom +1`, MAX_LIVES 초과 안 됨 확인
- 게임 종료(game:over/game:complete) 후 stash 타이머가 재개하지 않음 확인
- game:restart 후 itemSlots 전부 false 초기화 확인
