# TROUBLESHOOTING_싱글_핫픽스_다시하기_아이템_멈춤

> hotfix/싱글-다시하기-아이템-멈춤 브랜치 — `SingleScene.ts` 수정

---

## 증상

1. `/single` 진입 → 게임 시작
2. 게임 진행 도중 ESC → PauseModal 표시
3. PauseModal에서 "다시하기" 클릭 → 새 게임 시작 (정상)
4. 새 게임 진행 중 아이템(stash 또는 cherry-pick) 사용
5. → 낙하 노드가 멈춘 채로 영구 정지. 타이머도 멈춤.

게임 시작 → ESC 없이 자연 종료 → 다시하기 흐름에서는 발생하지 않음. **ESC pause를 거친 후 다시하기**가 트리거.

---

## 진단

**isUserPaused 상태 전이 추적**

| 단계 | 발생 지점 | 상태 |
|------|-----------|------|
| 1. ESC 입력 | `useEscHandler` → `singleBus.emit('game:pause')` | — |
| 2. game:pause 수신 | `SingleScene.handleGamePause` | **`isUserPaused = true`** + `tweens.pauseAll()` + `timerEvent.paused = true` |
| 3. 다시하기 클릭 | `useResultModal`/`usePauseModal` → `singleBus.emit('game:restart', payload)` | — |
| 4. game:restart 수신 | `SingleScene.handleGameRestart` | `scene.restart({ autoStart: true })` |
| 5. scene.restart | Phaser → `shutdown()` → `create()` | **인스턴스 보존** — 멤버 변수가 그대로 유지 |
| 6. create() 진입 | `SingleScene.create` | `commandSet`/`commandIndex`/`elapsedMs`/`isGameEnded`/`isTutorialMode`/`fallDuration` 만 재할당. **`isUserPaused`는 미초기화 → stale `true` 유지** |
| 7. autoStart 분기 | `startTimer()` + `showCurrentCommand()` | 새 timerEvent + 새 tween 생성. `tweens.pauseAll()` 상태 그대로지만 새 tween은 paused 아님 → 낙하 정상 |
| 8. 아이템 stash 사용 | `handleItemUse` (slot 0) | `tweens.pauseAll()` + `delayedCall(5000)` 등록 |
| 9. 5초 후 콜백 | stash 콜백 | `if (!isGameEnded && !isUserPaused) tweens.resumeAll()` — **`isUserPaused === true`이므로 skip** → tween 영구 정지 |

**근본 원인**

`scene.restart()`는 Phaser 씬 인스턴스를 보존한다(`lifecycleHandlersRegistered` 가드가 그 가정으로 작성됨). 그러나 `create()`는 새 세션의 멤버만 재할당하고 `isUserPaused`처럼 일시정지 상태를 추적하는 변수를 명시적으로 초기화하지 않는다.

ESC 직후 다시하기를 누른 경우 `handleGamePause`가 set한 `isUserPaused = true`가 새 세션으로 흘러들어가고, 이후 아이템 사용 시 `tweens.pauseAll()`을 호출하는 stash/cherry-pick의 resume 가드(`if (!isUserPaused) ...`)가 영구 차단된다.

> 관련 핫픽스: `TROUBLESHOOTING_싱글_핫픽스_ESC커맨드미낙하_재진입실패.md` — Bug 1이 `handleGameStart`(=`game:start` 핸들러)에 `tweens.resumeAll() + isUserPaused = false`를 추가했으나, 다시하기 경로는 `scene.restart({ autoStart: true })`이라 `handleGameStart`를 거치지 않고 `create()` autoStart 분기로 직행 → 해당 fix가 적용되지 않음.

---

## 해결

**파일: `FE/src/features/single/scenes/SingleScene.ts`**

`create()`에 일시정지 상태 변수의 명시적 초기화 + TweenManager 해제를 추가하고, `shutdown()`에 `timerEvent` null 정리를 추가한다.

```ts
// Before
create(data?: object): void {
  const raw = data as SingleSceneData & { autoStart?: boolean };
  const { difficulty, commandSet, autoStart } = raw;

  this.commandSet = commandSet;
  this.commandIndex = 0;
  this.elapsedMs = 0;
  this.isGameEnded = false;
  this.isTutorialMode = raw.isTutorial ?? false;
  this.fallDuration = FALL_DURATION_MS[difficulty];

  this.initLanes(commandSet);
  this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === 'main'));
  this.registerEvents();
  ...
}

shutdown(): void {
  this.timerEvent?.remove();
  this.lanes.clear();
  ...
}

// After
create(data?: object): void {
  const raw = data as SingleSceneData & { autoStart?: boolean };
  const { difficulty, commandSet, autoStart } = raw;

  this.commandSet = commandSet;
  this.commandIndex = 0;
  this.elapsedMs = 0;
  this.isGameEnded = false;
  // scene.restart()는 인스턴스를 보존하므로, 이전 게임에서 ESC(handleGamePause)가
  // set한 isUserPaused와 tweens.pauseAll() 상태가 새 게임으로 흘러들어와
  // 아이템(stash/cherry-pick) resume 콜백의 `!isUserPaused` 가드를 막아 멈춤이 발생한다.
  // 매 create()마다 명시적으로 초기화해 새 세션을 깨끗한 상태로 시작한다.
  this.isUserPaused = false;
  this.isTutorialMode = raw.isTutorial ?? false;
  this.fallDuration = FALL_DURATION_MS[difficulty];

  this.initLanes(commandSet);
  this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === 'main'));
  this.tweens.resumeAll();
  this.registerEvents();
  ...
}

shutdown(): void {
  this.timerEvent?.remove();
  this.timerEvent = null;
  this.lanes.clear();
  ...
}
```

**왜 세 군데인가**

| 추가 | 이유 |
|------|------|
| `this.isUserPaused = false` | 본 버그의 근본 원인. stale `true` 차단 |
| `this.tweens.resumeAll()` | `handleGamePause`/`handleItemUse`가 호출한 `tweens.pauseAll()` 잔존 해제. 새 tween이 만들어져도 TweenManager 자체가 paused면 영향받는 Phaser 동작에 대한 방어 |
| `this.timerEvent = null` | `shutdown()`이 `remove()`만 하고 참조를 안 끊어둠. 새 `startTimer()` 호출 전 구간(non-autoStart 경로)에서 stale 참조로 `if (this.timerEvent) ...` 가드가 의도와 다르게 동작할 위험을 차단 |

---

## 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `FE/src/features/single/scenes/SingleScene.ts` | `create()`에 `isUserPaused = false` + `tweens.resumeAll()` 추가, `shutdown()`에 `timerEvent = null` 추가 |

---

## 재현 조건

1. 싱글 모드 진입 (any difficulty)
2. 게임 시작 후 명령어 한두 개 입력
3. ESC → PauseModal 표시
4. PauseModal "다시하기" 클릭 → 새 게임 시작
5. 새 게임에서 stash 또는 cherry-pick 아이템 획득
6. 아이템 사용
7. → stash: 5초 후에도 노드 미낙하 + 타이머 정지 / cherry-pick: 애니메이션 후에도 동일 증상

---

## Test Plan

- ESC → 다시하기 → stash 사용 → 5초 후 노드 정상 낙하 재개 확인
- ESC → 다시하기 → cherry-pick 사용 → 애니메이션 후 정상 진행 확인
- (회귀 방지) ESC 없이 자연 종료 → 다시하기 → 아이템 사용 → 정상 동작 확인
- (회귀 방지) 게임 진행 중 stash → ESC → 이어하기 → stash 콜백이 정상적으로 5초 후 발화하는지 확인
- (회귀 방지) 튜토리얼 모드 → 일반 게임 진입 시 isUserPaused 잔존 없는지 확인
