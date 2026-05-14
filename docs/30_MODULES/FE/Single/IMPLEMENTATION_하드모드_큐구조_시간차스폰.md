# Single_IMPLEMENTATION_하드모드_큐구조_시간차스폰

## Background / Context

기존 HARD 모드는 EASY/NORMAL과 동일하게 명령어 하나를 완료해야 다음이 등장하는 순차 spawn 구조였고, 차별화는 `FALL_DURATION_MS.HARD` 값만 짧게 잡는 식이었다. 결과적으로 HARD는 "빠른 NORMAL"에 가까워, 기획서의 "Conflict 미니게임 + 더 많은 브랜치" 기조와 무관한 단순 속도전이 되어 있었다.

기획서의 HARD 차별화 의도를 살리기 위해, **`fallDuration × 0.6` 시점에 다음 명령어를 미리 spawn**하는 시간차(look-ahead) 구조를 도입한다. 같은 레인에 노드가 2개까지 동시에 존재할 수 있어 시각 큐 자료구조가 필요하고, 매칭 로직은 변경 없이 commandSet 순차 인덱스를 그대로 유지한다.

CONFLICT 타입은 PR C(Conflict 미니게임)에서 정식 처리되지만, BE 명령어 셋에 이미 CONFLICT 타입이 등장하므로 enum/스키마 차원에서 먼저 추가해 두고 PR B에서는 일반 MERGE처럼 폴백 처리한다.

---

## Decision

### 1. BranchLane 큐 구조 — `features/single/scenes/BranchLane.ts`

기존 `commandNode: Container | null` + `fallTween: Tween | null` 단일 슬롯 구조를 `commandNodes: Container[]` 배열 큐로 변경한다. tween은 각 노드의 `data('tween')`에 첨부해 노드별 독립 수명을 보장한다.

신규/변경 API:

- `enqueueCommand(command, fallDuration, onTimeout)` — 큐 끝에 push + 트윈 시작. HARD 시간차 spawn 직접 호출.
- `showCommand(...)` — EASY/NORMAL 래퍼: `clearAll() + enqueueCommand()`. 외부 시그니처 보존.
- `removeBottomNode()` — 최하단 노드만 제거. 성공/실패 공통 경로.
- `flashSuccess()` — 최하단 노드를 `shift()`로 꺼내 폭발 애니메이션.
- `clearAll()` — 모든 노드 + 트윈 destroy. `game:end`/`restart` 시.
- `isRevealed()` / `setHidden()` — 신규. 명시 플래그 `revealed: boolean`로 alpha 트윈 race 회피.

### 2. SingleScene 시간차 spawn — `features/single/scenes/SingleScene.ts`

```ts
private difficulty: Difficulty = 'NORMAL';
private lastSpawnedIndex = -1;
private hardSpawnTimer: Phaser.Time.TimerEvent | null = null;
```

`showCurrentCommand`가 호출되면 기존 `hardSpawnTimer`를 취소하고 새로 등록한다. HARD 모드는 `fallDuration × 0.6` 후 `spawnNextHard()`를 발화한다.

```ts
private spawnNextHard(): void {
  if (this.isGameEnded) return;
  const nextIndex = this.lastSpawnedIndex + 1;
  if (nextIndex >= this.commandSet.length) return;
  const nextCmd = this.commandSet[nextIndex];
  const nextLane = this.lanes.get(nextCmd.branchName);
  // 레인이 아직 reveal되지 않은 경우(CREATE 완료 전) spawn skip.
  // command:complete → applyBranchEffect → revealLane 이후 handleCommandComplete에서 spawn.
  if (!nextLane?.isRevealed()) return;
  nextLane.enqueueCommand(nextCmd, this.fallDuration, () => this.onCommandTimeout());
  this.lastSpawnedIndex = nextIndex;
  this.scheduleNextHardSpawn();
}
```

`handleCommandComplete` / `onCommandTimeout` 둘 다 `if (this.lastSpawnedIndex < this.commandIndex)` 가드로 중복 spawn을 차단한다. 이미 prefetch된 다음 노드가 있으면 skip.

pause/resume/stash/cherry-pick 일시정지에는 `hardSpawnTimer.paused` 토글을 9곳 모두 추가한다.

`FALL_DURATION_MS.HARD`는 7_000 → 12_000ms로 조정한다. 큐 도입으로 화면에 2개가 동시에 보이는 만큼 절대 속도를 늦춰 체감 난이도를 균형 맞춘다.

### 3. CommandType에 CONFLICT 추가

전체 chain에 일관 적용:

- `shared/types/game.types.ts` — `CommandType = ... | 'CONFLICT'`
- `features/single/schemas/single.schema.ts` — zod enum에 `'CONFLICT'` 추가
- `features/single/bridge/singleBus.ts` — `GameRestartPayload` payload inline union 동기화
- `features/single/hooks/useExistingBranches.ts` — `MERGE`와 같이 브랜치 set에서 delete
- `features/single/scenes/SingleScene.ts` — `applyBranchEffect`에서 `MERGE || CONFLICT` 분기로 hideLane

PR C에서 `useCommandInput` 매칭 직후 `conflict:start` emit + 미니게임 오버레이를 추가하면 분기 확장이 가능하다.

### 4. NORMAL/HARD 수동 SWITCH 일반화 — `features/single/hooks/useCommandInput.ts`

기존 `isNormal = difficulty === 'NORMAL'`를 `requiresManualSwitch = difficulty === 'NORMAL' || difficulty === 'HARD'`로 일반화한다. 4곳(activeBranch 매칭, 은닉 SWITCH, 잘못된 브랜치 가드, 분기 조건)을 일괄 변경.

### 5. StartModal NORMAL/HARD 안내 — `features/single/components/StartModal.tsx`

```tsx
{(difficulty === 'NORMAL' || difficulty === 'HARD') && (
  <p className="text-xl text-orange-400">
    브랜치 전환 명령어가 떨어지지 않습니다. 직접 git switch로 브랜치를 이동해야 합니다.
  </p>
)}
{difficulty === 'HARD' && (
  <p className="text-xl text-orange-400">
    명령어가 시간차로 떨어집니다. 같은 레인에 두 개가 동시에 보일 수 있습니다.
  </p>
)}
```

### 6. Win11ExplorerModal HARD 차단 해제

기존 `isPreparingModeSelected = ... || selectedItem === 'HARD'` 분기를 제거하여 HARD를 정상 선택 가능 상태로 풀어준다. 멀티 탭만 "게임 준비중" 상태를 유지한다.

---

## Why

### 시간차 spawn 비율을 60%로 잡은 이유

체감 난이도 측정 시 50% 미만이면 동시 노드 두 개의 거리가 너무 가까워 시각 압박이 과도하고, 70% 이상이면 EASY/NORMAL과 차이가 없다. 60%는 다음 명령어가 화면 상단에 등장하면서 현재 명령어가 중하단으로 떨어진 시점에 해당해, "다음 것이 보이지만 아직 손은 현재 명령어"라는 압박을 만든다.

### 큐 자료구조를 BranchLane에 둔 이유

매칭 로직(`useCommandInput`)은 `commandSet[commandIndex]` 단일 인덱스로 동작하며 commandSet은 순차 배열이므로, **사용자가 쳐야 할 명령은 항상 최하단 노드 = commandSet[commandIndex]** 라는 불변식이 유지된다. BranchLane은 시각 큐만 관리하면 되고 매칭은 알아서 정합. 만약 매칭 측에 큐를 두면 시각/논리 큐 두 개를 동기화해야 해 복잡도가 폭증한다.

### `lastSpawnedIndex` 가드를 별도 필드로 둔 이유

`hardSpawnTimer`의 발화 시점은 사용자 완료 시점과 독립이라 같은 인덱스가 두 경로에서 spawn될 수 있다. `commandIndex`(= 완료 진행도)와 `lastSpawnedIndex`(= 시각 spawn 진행도)를 분리하면 두 경로 모두 `lastSpawnedIndex < commandIndex` 한 줄로 중복 차단된다.

### `isRevealed()`에 명시 플래그를 둔 이유

`alpha` 값으로 판단하면 `revealLane()` 트윈 시작 직후 첫 프레임까지 0일 수 있어 spawn 가드로 신뢰할 수 없다. `revealed: boolean`을 `revealLane`/`hideLane`/`setHidden`에서 즉시 토글해 트윈 진행과 무관하게 정확한 상태를 제공한다.

### CONFLICT를 PR B에서 미리 추가한 이유

BE 명령어 셋 응답에 이미 CONFLICT 타입이 등장하므로 zod schema가 enum 불일치로 throw하면 게임 시작이 불가능해진다. PR B에서 enum/스키마/타입을 모두 추가하고 동작은 MERGE 폴백으로 두면, PR C에서 매칭 직후 분기만 한 줄 추가하면 된다.

---

## Caution

- **BE HARD commandSet 미준비**: 현재는 `features/single/api/hardSessionMock.ts`의 임시 mock을 `singleApi.startSession`에서 분기 반환 중. BE 정식 응답 합류 시 mock 파일 + singleApi 분기 둘 다 삭제. 파일 헤더에 명시.
- **노드별 독립 timeout**: 각 노드의 `delayedCall`/`onComplete` 콜백이 자기 자신만 제거해야 한다. 항상 `commandNodes[0]`을 참조하면 timeout 발화 시점에 이미 [0]이 아닐 수 있으므로 노드 인스턴스를 클로저로 캡처. 현 구현은 `node.setData('tween', tween)`로 노드와 tween을 묶어 처리.
- **stash/cherry-pick 중 spawn 안 됨 가정**: `showCurrentCommand`는 `handleGameStart`/`handleCommandComplete`/`onCommandTimeout` 세 경로에서 호출되는데, 셋 다 stash/cherry-pick이 active일 수 없는 시점이다(아이템 발동 중에는 tween이 멈춰 timeout 자체가 일어나지 않음). 따라서 새로 schedule된 `hardSpawnTimer`가 stash 중 발화해 강제 spawn하는 케이스는 발생하지 않는다.
- **scene.restart 인스턴스 보존**: HARD 필드(`difficulty`/`lastSpawnedIndex`/`hardSpawnTimer`)는 모두 `create()`에서 명시 초기화한다. `isUserPaused`/`tweens.pauseAll()` 잔존 이슈와 동일 대응.
- **튜토리얼은 HARD 무관**: `isTutorialMode`면 `handleGameStart` 단계에서 타이머 미시작 + tutorial bus만 사용. HARD 분기를 거치지 않는다.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/` / `npm run build`
- `scoreCalculator.test.ts` 등 기존 37개 통과 유지
- **EASY/NORMAL 회귀**: 게임 시작 → 명령어 입력 → miss → item 사용 → 종료 → 다시하기 흐름 무변화
- **HARD 수동 시나리오**:
  - 같은 레인 연속 명령어에서 노드 2개 동시 표시 확인
  - 매칭 시 최하단 노드만 폭발, 두 번째 노드는 계속 낙하
  - 사용자가 0.6×fall보다 빠르게 완료해도 다음 노드가 1번만 spawn (중복 차단)
  - timeout — 최하단 노드만 miss 처리, 두 번째 노드는 계속 낙하
  - CREATE 직후 새 레인 spawn 경계: time-spawn은 skip되고 `command:complete` 폴백으로 정상 spawn
  - cmd type=CONFLICT 자리에서 일반 MERGE처럼 hideLane 동작 (PR C에서 미니게임으로 교체)
  - 게임 종료 시 모든 레인 노드 정리(`clearAll`)
- pause/stash/cherry-pick으로 일시정지 → 재개 시 `hardSpawnTimer`도 정확히 재개되는지 확인

---

## 후속 작업

- **PR C — Conflict 미니게임**: `useCommandInput`의 CONFLICT 분기에서 `conflict:start` emit, `features/single/scenes/ConflictMiniGame*` 또는 React 오버레이 추가. 성공/실패 결과 처리.
- **BE 정식 HARD commandSet 합류**: `hardSessionMock.ts` + `singleApi.ts` HARD 분기 제거. `GIT_TYPING_GAME_SPEC.md`의 HARD 표(브랜치 수, 명령어 범위, 시간차 spawn 명세) 업데이트.
