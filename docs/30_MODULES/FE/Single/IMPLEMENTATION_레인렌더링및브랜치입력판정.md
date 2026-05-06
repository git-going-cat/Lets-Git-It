# Single_IMPLEMENTATION_레인렌더링및브랜치입력판정

## Background / Context

싱글 모드 게임의 Phaser 레인 시각화와 브랜치 기반 입력 판정을 구현하는 작업.  
기존에는 레인이 게임 시작 시 모두 표시되고, 입력 판정이 텍스트 일치만 확인했다.  
명세에 따라 (1) CREATE 시 레인이 동적으로 나타나고 MERGE 시 사라져야 하며, (2) NORMAL 모드에서는 현재 브랜치 위치도 정답 조건에 포함되어야 한다.

---

## Decision

### 1. 동적 레인 생성·소멸

게임 시작 시 `commandSet`에 등장하는 모든 브랜치 레인을 미리 생성하되, `main`이 아닌 레인은 `alpha=0`으로 숨긴다.  
레인 너비·위치는 전체 브랜치 수 기준으로 처음부터 고정 분할한다.

- **CREATE 명령어 정답**: `lane:create` 이벤트 emit → `BranchLane.revealLane()` (alpha 0→1, 500ms tween)
- **MERGE 명령어 정답**: `handleCommandComplete`에서 `parseSwitchTarget(cmd.text)`로 병합 브랜치명 추출 → `BranchLane.hideLane()` (alpha 1→0, 500ms tween)

```ts
// SingleScene.initLanes
branches.forEach((branch, i) => {
  const lane = new BranchLane(this, i, branches.length, branch);
  if (branch !== 'main') lane.setAlpha(0);
  this.lanes.set(branch, lane);
});
```

### 2. 활성 브랜치 글로우 효과 (`BranchLane.setLaneActive`)

활성 레인 배경에 브랜치 색상 12% 투명도의 직사각형 글로우를 표시한다.  
`setActive`는 Phaser `GameObject`에 이미 존재하는 메서드명이므로 `setLaneActive`로 명명한다.

```ts
setLaneActive(isActive: boolean): void {
  if (isActive && !this.activeGlow) {
    // glow 생성 + alpha 0→1 tween (300ms)
  } else if (!isActive && this.activeGlow) {
    // alpha 1→0 tween 후 destroy (300ms)
  }
}
```

게임 시작 시 `main` 레인만 활성화, `branch:switch` 이벤트 수신 시 전체 레인을 순회해 대상 레인만 활성화한다.

### 3. 입력 판정 3단계 우선순위 (`useCommandInput`)

Enter 키 입력 시 다음 순서로 판정한다.

| 우선순위 | 조건 | 처리 |
|---------|------|------|
| ① 정답 | `텍스트 일치 && 브랜치 일치` | `command:complete` emit, CREATE/SWITCH면 activeBranch 이동 |
| ② 은닉 SWITCH (NORMAL 한정) | `git switch <branch>` 형식 (※ `-c` 제외) | 점수 없이 activeBranch만 이동 |
| ③ 오타 | 나머지 | `typoCount++`, `combo=0`. 목숨 차감 없음 |

```ts
const branchMatches = !isNormal || activeBranch === currentCommand.branchName;

if (textMatches && branchMatches) { /* 정답 */ }
else if (isNormal && !textMatches && isSwitchCommand(trimmed)) { /* 은닉 SWITCH */ }
else { /* 오타 */ }
```

### 4. `activeBranchAtom`

`atom<string>('main')`으로 초기화. 유저의 현재 브랜치 위치를 추적한다.

- 정답 CREATE/SWITCH: `useCommandInput`에서 `parseSwitchTarget(text)`로 타깃 추출 후 업데이트
- 은닉 SWITCH: `useCommandInput`에서 동일하게 업데이트 (점수 없음)
- 게임 재시작: `useSingleGame.resetGame()`에서 `'main'`으로 초기화

### 5. `isSwitchCommand` 정규식 (`branchParser.ts`)

`git switch -c <branch>` (CREATE)는 노드로 표시되어야 하므로 은닉 SWITCH 판정에서 제외한다.

```ts
// ❌ 이전: switch -c까지 매칭
/^git\s+switch(\s+-c)?\s+\S+$/

// ✅ 이후: 하이픈으로 시작하는 인자 제외 → switch -c 불매칭
/^git\s+switch\s+(?!-)\S+$/
```

### 6. `flashMiss` (`BranchLane`)

시간 초과 miss 시 해당 레인 하단에 빨간 직사각형을 400ms 동안 표시한다.

```ts
flashMiss(): void {
  // canvasHeight - END_OVERSHOOT 위치에 0xef4444, alpha 0.6 rect 생성
  // 400ms tween alpha→0 후 onComplete에서 destroy + this.flashGraphic = null
}
```

**버그픽스**: 같은 브랜치에 연속 명령어가 있을 때 `flashMiss()` 직후 `showCurrentCommand()` → `showCommand()` → `clearCommand()` 호출로 방금 생성한 flash가 즉시 제거되던 문제를 수정했다.  
`clearCommand()`에서 `flashGraphic` 정리를 제거하고, flash 소멸은 자체 fade-out tween의 `onComplete`에서만 처리한다.

### 7. 난이도별 낙하 속도

```ts
const FALL_DURATION_MS: Record<Difficulty, number> = {
  EASY:   25_000,
  NORMAL: 15_000,
  HARD:    7_000,
};
```

### 8. NORMAL 모드 commandSet 규칙

- **CREATE** (`git switch -c <branch>`): commandSet에 포함 → 노드로 표시. branchName은 명령어를 입력하는 현재 브랜치.
- **SWITCH** (`git switch <branch>`): commandSet에 미포함 → 유저가 알아서 은닉 입력.
- **MERGE**: 정답 시 해당 브랜치 레인 소멸.

---

## Why

### 레인을 처음부터 생성해두는 이유

Phaser Container의 너비·위치는 생성 시점에 결정된다.  
CREATE 시 레인을 동적으로 추가하면 기존 레인의 x 좌표와 너비를 재계산·재배치해야 하며, 진행 중인 tween과 충돌한다.  
미리 생성 후 alpha로 표시·은닉하는 방식이 tween 충돌 없이 가장 단순하다.  
**알려진 한계**: main이 처음부터 전체 너비가 아닌 1/n 너비로 보인다.

### 브랜치 매칭을 NORMAL 모드에서만 하는 이유

EASY 모드 commandSet에는 SWITCH 명령어가 포함되어 있어 유저가 노드를 보고 브랜치를 이동한다.  
NORMAL 모드는 SWITCH가 은닉이므로 유저가 스스로 브랜치를 관리해야 하고, 현재 위치와 노드 브랜치가 다르면 오답 처리한다.

### `setLaneActive`로 명명한 이유

Phaser `GameObject.setActive(value: boolean): this`가 이미 존재해 오버라이드 시 반환 타입 불일치 TypeError가 발생한다.

---

## Caution

- 레인 너비는 `scene.scale.width / totalLanes`로 고정 분할된다. main이 처음부터 좁게 보이는 문제는 동적 레인 재배치 구현 시 해결 가능하다 (미구현).
- `parseSwitchTarget`은 입력 텍스트의 마지막 단어를 반환한다. MERGE 명령어(`git merge feat/editor`)에도 동일하게 사용되어 병합 브랜치명을 추출한다.
- NORMAL 모드에서 CREATE 명령어의 `branchName`은 명령어를 입력하는 브랜치(보통 `main`)여야 한다. 생성되는 브랜치명이 아님에 주의.
- `BranchLane.clearCommand()`는 `fallTween`과 `commandNode`만 정리하며 `flashGraphic`은 건드리지 않는다. `flashGraphic`은 자체 fade-out tween `onComplete`에서 소멸된다. 같은 레인에 연속 명령어가 있어도 flash가 유지된다.
- `flashMiss()` 내부에서 기존 `flashGraphic`이 있으면 먼저 destroy 후 새 flash를 생성한다. 연속 miss 시 flash가 중복 생성되지 않는다.

---

## Test Plan

- 게임 시작 시 `main` 레인만 보이고 나머지는 숨겨져 있는지 확인
- CREATE 정답 입력 → 해당 브랜치 레인 fade-in 확인
- MERGE 정답 입력 → 병합 브랜치 레인 fade-out 확인
- 활성 브랜치 레인에 글로우 표시, 비활성 레인에 글로우 사라짐 확인
- 시간 초과 → 해당 레인 하단 빨간 flash 확인
- NORMAL 모드에서 `main` 명령어를 `feat/editor` 상태에서 입력 → 오타 처리 확인
- NORMAL 모드에서 `git switch main` 입력 → 오답 처리 없이 activeBranch 변경 확인
- NORMAL 모드에서 `git switch -c feat/new` 입력 → 은닉 SWITCH로 처리되지 않고 오타 처리 확인
