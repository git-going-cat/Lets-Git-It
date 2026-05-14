# Single_IMPLEMENTATION_CONFLICT_미니게임

## Background / Context

PR B(`IMPLEMENTATION_하드모드_큐구조_시간차스폰`)에서 `CommandType`에 `'CONFLICT'`를 추가하고 임시로 일반 MERGE처럼 처리해 두었다. HARD 모드의 차별화 포인트인 "merge conflict 해결" 요소가 아직 없어, HARD가 단순히 "빠르고 명령어 많은 NORMAL"에 머물러 있었다.

이 PR에서 CONFLICT 명령어를 정타하거나 cherry-pick 아이템으로 잡으면 화살표 시퀀스 미니게임이 떠 컨플릭 해결 과정을 시뮬레이션한다. 동물농장 과일깎기 게임처럼 5개의 화살표(↑↓←→)를 순서대로 입력해야 일반 MERGE 효과로 진행된다.

동시에 BE의 HARD 정식 commandSet이 합류해 `features/single/api/hardSessionMock.ts` + `singleApi.startSession`의 HARD 분기가 제거됐다.

이후 다른 게임 모드(멀티/협력)에서도 conflict 미니게임을 재사용할 가능성을 고려해, 미니게임 자산 일체를 `shared/`로 이관하고 도메인별 wiring만 호출자가 주입하는 구조로 설계한다.

---

## Decision

### 1. 미니게임 사양 (사용자 확정)

- **트리거**: CONFLICT 명령어 정타 후 또는 cherry-pick 아이템으로 잡은 직후
- **시퀀스**: 화살표 5개 랜덤 (직전 화살표와 같은 방향은 제외 — 한 키 연타 차단)
- **시간 제한**: 없음 (오직 시퀀스 정타만이 완료 조건)
- **실패 처리**: 오타 1회 카운트 (totalAttempts++, combo=0, typoCount++, `command:wrong` emit) + 진행도 0 리셋. 목숨 미차감, 오버레이 유지
- **성공 처리**: 일반 MERGE 효과(`applyBranchEffect`로 해당 레인 hideLane) + 다음 명령어로 진행
- **게임 시간**: 미니게임 중에도 계속 흐름. 명령어 낙하(tween)와 HARD 미리 스폰(`hardSpawnTimer`)만 멈춤
- **ESC pause**: 미니게임 중에도 정상 동작. 일시정지 중에는 화살표 입력만 무시

### 2. 위치 — `shared/` 이관

향후 멀티/협력 모드 재사용을 위해 미니게임 자산을 도메인 무관 `shared/`로 분리한다.

| 파일 | 역할 |
|---|---|
| `shared/game/conflictArrows.ts` | `ArrowKey` 타입 + `generateArrowSequence` 헬퍼 (직전 방향 제외) |
| `shared/game/conflictScenarios.ts` | `ConflictScenario` 타입 + `CONFLICT_SCENARIOS` (4가지 diff 풀) |
| `shared/store/conflictMiniGameAtom.ts` | `conflictMiniGameAtom` + `ConflictMiniGameState` |
| `shared/components/ConflictMiniGameOverlay.tsx` | 도메인 무관 오버레이. `onResolve` / `onTypo` props로 도메인별 wiring 주입 |
| `shared/game/branchParser.ts` | `parseAddTarget` 추가 (`parseSwitchTarget`과 대칭) |

도메인별 wiring은 호출자가 담당한다:

- **single**: `useCommandInput`의 정타 분기 + `SingleScene`의 체리픽 분기에서 `singleBus.emit('conflict:start', ...)` 호출, `SingleGameContent`가 `onResolve`/`onTypo`로 `singleBus.emit('conflict:resolve'/'typo', ...)` wiring
- **multi/coop**: 본인 도메인 버스(`multiBus` 등)로 동일 패턴 wiring하면 그대로 사용 가능

### 3. atom 구조

오버레이가 도메인 commandSet 형태에 의존하지 않도록, 헤더 표시용 데이터(`headBranch`/`incomingBranch`/`filePath`)까지 atom에 포함시켰다.

```ts
interface ConflictMiniGameState {
  sequence: ArrowKey[];
  progress: number;
  scenarioIndex: number;
  /** onResolve/onTypo 콜백에 전달할 식별자. 호출자 도메인이 의미를 부여. */
  commandIndex: number;
  /** diff 좌측 헤더 — 현재 브랜치명 */
  headBranch: string;
  /** diff 우측 헤더 — 들어오는 브랜치명 */
  incomingBranch: string;
  /** 모달 헤더 파일 경로 */
  filePath: string;
}
```

### 4. bus 이벤트 3종 — `features/single/bridge/singleBus.ts`

```ts
'conflict:start': {
  index: number;
  sequence: ArrowKey[];
  headBranch: string;
  incomingBranch: string;
  filePath: string;
};
'conflict:typo': { index: number };
'conflict:resolve': { index: number };
```

- `conflict:start` → `useCommandInput`이 구독해 atom 세팅, `SingleScene`이 구독해 tween/hardSpawnTimer pause
- `conflict:resolve` → `useCommandInput`이 구독해 history/totalAttempts 갱신 + `command:complete` emit + atom clear, `SingleScene`이 구독해 tween 재개
- `conflict:typo` → `useCommandInput`이 구독해 오타 페널티 적용

### 5. 트리거 경로 두 가지

**경로 A — 정타 (useCommandInput)**

`features/single/hooks/useCommandInput.ts`에서 CONFLICT 정타 시 일반 성공 처리를 보류하고 `conflict:start` emit. display 데이터는 emit 시점에 계산한다.

```ts
if (currentCommand.type === 'CONFLICT') {
  singleBus.emit('conflict:start', {
    index: commandIndex,
    sequence: generateArrowSequence(),
    headBranch: currentCommand.branchName,
    incomingBranch: parseSwitchTarget(currentCommand.text) ?? 'incoming',
    filePath: parseAddTarget(commandSet[commandIndex + 1]?.text) ?? DEFAULT_CONFLICT_FILE,
  });
} else { /* 기존 성공 처리 */ }
```

**경로 B — 체리픽 (SingleScene)**

`features/single/scenes/SingleScene.ts`의 cherry-pick `delayedCall` 콜백에서 `cmd.type === 'CONFLICT'`면 동일하게 `conflict:start` emit. `command:complete`는 보류.

```ts
if (cmd?.type === 'CONFLICT') {
  if (!this.isUserPaused && this.timerEvent) this.timerEvent.paused = false;
  singleBus.emit('conflict:start', { /* display 데이터 포함 */ });
}
```

두 경로 모두 동일 atom을 세팅하므로 오버레이 진입 후 동작은 완전히 같다.

### 6. SingleScene pause 정책

게임 시간(`timerEvent`)은 미니게임 중에도 계속 흘러야 하므로 `tweens.pauseAll()` + `hardSpawnTimer.paused`만 토글한다.

```ts
private readonly handleConflictStart = (): void => {
  this.isConflictActive = true;
  this.tweens.pauseAll();
  if (this.hardSpawnTimer) this.hardSpawnTimer.paused = true;
};

private readonly handleConflictResolve = (): void => {
  this.isConflictActive = false;
  if (this.isUserPaused) return; // ESC pause 중이면 game:resume 시점에 풀린다
  this.tweens.resumeAll();
  if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
};
```

`handleGameResume`에 `isConflictActive` 가드 추가 — ESC pause→resume 시 미니게임이 아직 진행 중이면 tween/hardSpawnTimer는 그대로 두고 `timerEvent`만 재개한다.

```ts
if (this.isConflictActive) {
  if (this.timerEvent) this.timerEvent.paused = false;
  return;
}
```

`create()`에서 `isConflictActive = false` 명시 초기화 (scene.restart 인스턴스 보존 대응).

### 7. CONFLICT 파일명 추출 — `parseAddTarget`

CONFLICT 다음 명령어가 항상 `git add <path>` 형태라는 BE 규칙을 이용해 파일명을 도출한다. `shared/game/branchParser.ts`에 `parseSwitchTarget`과 대칭 위치로 추가.

```ts
export function parseAddTarget(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.trim().match(/^git\s+add\s+(\S+)$/);
  return match ? match[1] : null;
}
```

매칭 실패 시 호출자가 `DEFAULT_CONFLICT_FILE` (`features/single/constants/conflict.ts`)로 폴백.

### 8. 시나리오 풀 (`CONFLICT_SCENARIOS`)

진입 시 한 개를 랜덤 선택해 `state.scenarioIndex`에 고정. 진행 중에는 시나리오가 바뀌지 않는다. 4가지 풀:

- 함수 본문 변경
- 환경 변수 (PORT/HOST)
- config 객체 (debug/retry)
- import 추가

BE가 conflict 본문을 직접 보내주기 전까지의 임시 fallback. BE 합류 시 atom의 `head`/`incoming` 필드로 대체할 수 있다.

### 9. 화살표 키캡 — 스프라이트 시트

`src/assets/game/arrow.png` (512×64, 64×64 8프레임). 순서: L-before, L-after, R-before, R-after, U-before, U-after, D-before, D-after. `before`(흑백) / `after`(컬러) 두 상태를 같은 PNG로 처리.

상태별 표시:

| 상태 | sprite | 추가 시각 효과 |
|---|---|---|
| pending (대기) | before | — |
| current (현재 입력 차례) | before | 노란 ring |
| done (정타 완료) | after | — |
| correct flash (정타 직후 180ms) | after | scale-125 |
| wrong flash (오답 직후 180ms) | before | 빨간 ring + scale-125 |

CSS `background-image` + `background-position`으로 한 PNG로 모든 프레임 처리. `CatSprite.tsx`와 동일 패턴.

### 10. UI 구조 — nes.css 픽셀 디자인

오버레이는 두 개의 `nes-container is-dark with-title`로 영역 분리:

- **MERGE CONFLICT** (위) — 파일 경로 + `! merge conflict` 헤더 + 좌(빨강 틴트) / 우(초록 틴트) 코드 패널
- **RESOLVE** (아래) — 안내 문구 + 화살표 키캡 5개

좌/우 diff 패널은 nested `nes-container` 대신 두꺼운 컬러 보더 + 픽셀 그림자(`shadow-[4px_4px_0_rgba(0,0,0,0.5)]`)로 처리해 시각 구분을 강화했다.

---

## Why

### 왜 `shared/`로 분리했나

CONFLICT 미니게임은 본질적으로 "5키 정타로 도메인 액션 1개를 완료한다"는 게임 메커닉 자체이고, 어느 게임 모드에서 트리거되느냐와는 독립적이다. 멀티/협력 모드에서도 conflict 처리가 필요할 가능성이 높아, 처음부터 도메인 무관 자산으로 두면 다음 모드 작업 시 wiring 한 번으로 끝난다. 도메인별 의존(예: `singleBus`)을 오버레이에 박아두면 두 번째 도메인이 들어올 때 추출 비용이 더 든다.

### 왜 callback props 방식인가 (vs 자체 emit)

오버레이가 `singleBus.emit('conflict:resolve', ...)`를 직접 호출하면 single 도메인에 결합된다. `onResolve`/`onTypo` props를 받는 형태로 두면, 호출자가 `useCallback`으로 자기 도메인의 bus emit을 묶어 주입하면 끝. 오버레이 자체는 bus의 존재를 모른다 (`gameStatusAtom`은 모든 도메인이 공유하는 React 상태라 직접 구독 OK).

### 왜 display 데이터(headBranch/filePath 등)를 atom에 넣었나

오버레이가 `commandSet[commandIndex]`를 직접 읽으면 commandSet 스키마(도메인별 다를 수 있음)에 결합된다. 데이터를 emit 시점에 계산해 atom에 박아 두면, 오버레이는 atom만 보고 렌더할 수 있어 도메인 무관성이 유지된다.

### 왜 게임 타이머는 멈추지 않나

미니게임도 일종의 게임 액션이고, 시간 제한 없는 무한 휴식이 되어 버리면 HARD 모드 전체 시간 균형이 깨진다. 명령어가 낙하 중 사용자가 CONFLICT를 잡으면 그 명령어의 낙하만 멈추고 게임 시간은 계속 흐른다. miss는 tween 완료로 트리거되므로 tween 정지 중에는 발생하지 않아 안전하다.

### 왜 별도 이벤트(`conflict:start`)인가, `game:pause` 재사용 안 함

`game:pause`는 `gameStatusAtom`을 'paused'로 바꿔 PauseModal을 열고 게임 타이머도 멈춘다. 미니게임은 PauseModal과 무관하고 타이머도 흘러야 하므로 별도 이벤트로 분리한다. 두 동작이 직교(미니게임 중에도 ESC pause 가능)해야 하기에 `isConflictActive` 플래그도 별도로 둔다.

### 왜 정타/체리픽 두 경로 모두 useCommandInput에서 atom을 세팅하지 않나

체리픽은 `SingleScene` 내부 `delayedCall` 콜백에서 발화하므로 React 상태 직접 변경이 불가능하다. emit-구독 패턴으로 통일하면 두 경로가 같은 `conflict:start` 이벤트를 발사하고, `useCommandInput`의 구독 핸들러가 단일 책임으로 atom을 세팅한다. 분기 로직이 한 곳에 모인다.

### 왜 시나리오는 진입 시 한 번만 뽑나

오답 시 `setState({...state, progress: 0})`로 진행도만 리셋하면서 `scenarioIndex`는 spread로 유지된다. 사용자가 같은 시나리오를 다시 풀게 되므로 학습 효과가 생기고, 매번 시나리오가 바뀌면 시각적 혼란만 커진다.

### 왜 시간 제한을 두지 않았나

시간 제한이 있으면 conflict가 단순 반사 게임이 된다. 화살표 5개는 신중하게 보고 누르는 짧은 흐름이라, 시간보다 정확성을 평가하는 게 미니게임 의도에 더 맞다. 게임 전체 타이머는 계속 흐르므로 무한정 머무를 수도 없다.

### 왜 nes.css `nes-container is-dark with-title`을 두 개 썼나

처음에는 단일 컨테이너 + 내부 그리드로 구성했으나 "diff 읽는 곳"과 "조작하는 곳"의 시각 구분이 약했다. nes.css의 with-title 컨테이너 두 개로 분리하면 "MERGE CONFLICT" / "RESOLVE" 두 영역이 명확히 분리되어 인지 부하가 줄어든다.

---

## Caution

- **scenarioIndex spread 유지**: 오답 처리 시 `setState({ ...state, progress: 0 })` 형태로 유지한다. 새 객체로 만들면 scenarioIndex가 사라져 시나리오가 매번 바뀐다.
- **`isConflictActive` 초기화**: `create()`에서 `false`로 명시 리셋한다. scene.restart 인스턴스 보존 때문에 카운터/플래그류는 모두 명시 초기화 원칙.
- **`handleGameResume`의 가드 순서**: stash → cherry-pick → conflict → 일반 재개 순서가 중요. stash/cherry-pick은 자체 delayedCall이 완료 시점에 정상 재개를 처리하므로 짧은 가드만, conflict는 명령어 낙하 자체를 보류 중이라 별도 가드 필요.
- **`conflict:resolve` 핸들러의 commandSet 조회**: 클로저가 stale일 수 있으므로 `useSingleStore.getState().commandSet[index]?.text`처럼 store에서 직접 읽는다. (다른 곳의 `appendLog` 패턴과 동일)
- **`useCommandInput`의 conflict 미니게임 중 입력 차단**: `handleKeyDown` 초입에 `if (conflictMiniGame !== null) return`. 같은 CONFLICT 명령어를 다시 정타해 atom을 덮어쓰는 사고 방지.
- **오버레이는 모달 아님**: `useModal` 미사용. ESC가 통과해 `useEscHandler` → PauseModal로 가야 하므로 focus trap을 걸지 않는다. 화살표 키만 keydown 핸들러로 가로채고 나머지는 silent ignore.
- **체리픽 콜백에서 timer만 재개**: 일반 명령어 경로는 모두 재개하지만 CONFLICT 경로는 `timerEvent`만 재개한다. tween/hardSpawnTimer는 `handleConflictStart`가 다시 멈춰 두므로 여기서 풀면 안 된다.
- **시나리오 fallback**: `CONFLICT_SCENARIOS[state.scenarioIndex] ?? CONFLICT_SCENARIOS[0]` — 배열 변경 시 인덱스 오버플로 방지.
- **`parseAddTarget` 형식 가정**: BE가 `git add <path>` 단순 형태를 보내준다는 전제. 옵션 플래그(`-A`, `--all` 등) 추가되면 매칭 실패해 fallback 발동. 현재는 BE 합의 형태라 안전.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/`
- 기존 테스트(`scoreCalculator.test.ts` 등) 통과 유지

**E2E 수동 (HARD)**

- HARD 진입 → CONFLICT 명령어(`git merge feat/story` 등)까지 진행 → 정타 + Enter → 오버레이 등장 + 명령어 낙하 정지 + 게임 타이머 계속 진행 확인
- 화살표 5개 정타 → 오버레이 닫힘, 해당 레인 페이드아웃, 다음 명령어 spawn, score/totalAttempts/combo가 정확히 1만 증가
- 화살표 오답 → 진행도 시각적으로 0 리셋, 해당 키캡 빨간 ring + scale flash, combo 0, typoCount++, 화면 흔들림(`command:wrong`)
- 정타 키 → 해당 키캡 컬러로 전환 + scale flash, 진행도 1 증가
- 화살표 키 홀드 → 진행도 한 번만 증가 (`e.repeat` 가드)
- 미니게임 중 ESC → PauseModal 등장, 화살표 키 무반응, 재개 시 진행도/시나리오 보존
- 미니게임 중 다시하기/게임오버/완료 → 오버레이 잔존 없음 (`resetInput`에서 atom null)
- 체리픽 아이템을 CONFLICT 명령어에 사용 → 발바닥 애니메이션 종료 후 미니게임 등장 (정타 경로와 동일하게 진행)

**시나리오 검증**

- 같은 CONFLICT를 여러 번 오답으로 리트라이해도 시나리오가 바뀌지 않음
- 게임 재시작 후 새 CONFLICT 진입 시 시나리오가 새로 랜덤 선택됨

---

## 후속 작업

- **BE conflict 본문 합류**: BE가 CONFLICT 명령어에 실제 diff 본문(`head`/`incoming` 배열)을 보내주면 `CONFLICT_SCENARIOS` 풀을 제거하고 atom의 `head`/`incoming` 필드로 직접 받는다. 스키마 변경 후 `useCommandInput` / `SingleScene`의 emit payload 확장.
- **멀티/협력 도메인 적용**: 해당 도메인의 hook/scene에서 `conflict:start` 상응 이벤트 emit + `MultiGameContent` 등에서 `<ConflictMiniGameOverlay onResolve={...} onTypo={...} />` 마운트하면 즉시 사용 가능.
- **시퀀스 길이 난이도별 조정**: 현재 5개 고정. 도메인별로 `generateArrowSequence(length)`에 다른 값을 넘기면 됨.
