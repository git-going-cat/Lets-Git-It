# Single_IMPLEMENTATION_타이핑입력로직_EventBus연동

## Background / Context

싱글 모드 게임의 핵심 플레이 루프를 완성하는 작업 (S14P31A304-128).  
126·127번 작업에서 레이아웃, atom, Phaser Scene 껍데기, 세션 store까지 완성됐으나, 실제로 키보드 입력이 게임에 반영되지 않았고 Phaser Scene과 React HUD 사이의 상태 동기화가 없어 게임 진행이 불가능한 상태였다.

---

## Decision

### 1. 타이핑 입력 로직 — `useCommandInput`

Enter 키 입력 시점에 정답을 판정한다.

- 정답: `EventBus.emit('command:complete', { index: commandIndex })` 발행. 인덱스를 함께 전달해 Scene과 React 양쪽 모두 동일한 기준으로 동기화한다.
- 오타: `comboAtom` 즉시 리셋 + `typoCountAtom` 증가. 목숨은 차감하지 않는다 (목숨은 시간 초과 miss에서만 차감).
- `command:miss` / `game:restart` / `game:over` / `game:complete` 이벤트 수신 시 입력창 초기화.

### 2. EventBus → Jotai 브릿지 — `useSingleGame`

Phaser Scene이 emit하는 이벤트를 구독해 HUD atom을 갱신한다.

| EventBus 이벤트 | Jotai 변경 |
|----------------|-----------|
| `command:miss` | `livesAtom` -1, `comboAtom` 0, `commandIndexAtom` 동기화. lives ≤ 0이면 `game:over` 재발행 |
| `command:complete` | `commandIndexAtom` +1, `comboAtom` +1 |
| `timer:tick` | `elapsedTimeAtom` 갱신 |
| `game:pause` | `gameStatusAtom` → `'paused'` |
| `game:over` | 점수 계산(GAMEOVER는 0점), `gameResultAtom` 저장, `gameStatusAtom` → `'gameover'` |
| `game:complete` | `calcScore()` 호출, `gameResultAtom` 저장, `gameStatusAtom` → `'cleared'` |
| `game:restart` | 모든 atom 초기값 복구 |

### 3. Scene 내부 로직 — `SingleScene` + `BranchLane`

- `BranchLane`: 브랜치별 세로 레인 렌더링 + 명령어 낙하 tween. tween 완료(시간 초과) 시 `onTimeout` 콜백으로 Scene에 miss를 알린다.
- `SingleScene`: 레인 초기화 → EventBus 등록 → 타이머 시작 → 명령어 순차 표시. `command:complete` 수신 시 다음 명령어로 진행. 마지막 명령어 완료 시 `game:complete` emit.

### 4. 콤보 증가 위치

`useSingleGame`의 `handleComplete`에서 `comboAtom +1` 처리.  
`useCommandInput`은 입력 판정만 담당하고, 상태 변경은 `useSingleGame`이 단일 책임을 갖는다.  
(오타 시 `useCommandInput`에서 직접 `setCombo(0)` 하는 것은 EventBus를 거치지 않는 즉각적인 UX 피드백으로 예외 인정.)

---

## Why

### 정답 판정을 Enter 시점으로 고정한 이유

실시간 비교(`onChange`) 방식은 부분 입력 시 조기 판정이 가능해 게임 밸런스를 깬다.  
타이핑 게임 컨벤션에 맞게 Enter 시 최종 판정한다.

### 콤보 리셋을 두 곳(오타·miss)에서 하는 이유

- 오타: `useCommandInput`에서 즉시 리셋 → 입력 중 틀린 즉시 시각 피드백
- miss(시간 초과): `useSingleGame`의 `handleMiss`에서 리셋 → 낙하 완료 후 HUD 반영

두 경로는 독립된 실패 원인이며 두 번 리셋되더라도 결과는 동일하다.

### Phaser 인덱스를 우선시하는 이유 (`useCommandInput.ts` 주석 참고)

Enter 타이밍과 낙하 완료 타이밍이 겹칠 경우, 두 이벤트가 거의 동시에 발생한다.  
React의 `commandIndex` state보다 Phaser Scene이 들고 있는 `commandIndex`가 항상 동기화 기준이므로, emit 시 Scene 인덱스 기반으로 판단하고 React는 이벤트 수신 후 따라간다.

---

## Caution

- `command:miss` 수신 후 `isGameEnded` 플래그가 설정되기 전에 `showCurrentCommand()`가 호출될 수 있다. `SingleScene.onCommandTimeout()`에서 `if (this.isGameEnded) return` 가드로 방어하고 있다.
- `useSingleGame`의 `useEffect` 의존 배열이 `[]` (eslint-disable 처리)다. 게임 시작 시 한 번만 등록되어야 하며 difficulty 등이 변경될 때 재등록하면 이벤트 핸들러가 중복 등록된다. `stateRef`로 최신 값을 참조하는 방식으로 처리했다.
- `typoRef`로 최신 오타 수를 읽는 패턴은 이벤트 핸들러 클로저 stale 문제를 피하기 위함이다. atom 값이 클로저에 캡처되면 항상 초기값(0)이 읽힌다.
- `SinglePage`의 세션 데이터는 현재 `MOCK_SESSION` 하드코딩이다. API 연동 스프린트에서 `singleApi.ts` 구현 후 교체 필요.
- 아이템 사용(Alt+1/2/3) 로직은 미구현 상태다. `itemSlotsAtom`은 항상 `[false, false, false]`로 고정되어 있다.

---

## Test Plan

- 명령어 정답 입력 → `command:complete` emit → 다음 명령어로 진행 확인
- 명령어 오타 입력 → 콤보 0 리셋, 목숨 유지 확인
- 연속 정답 입력 → 콤보 카운트 누적 증가 확인 ← **이번 수정으로 추가**
- 명령어 낙하 완료(시간 초과) → `command:miss` → 목숨 1 감소 확인
- 목숨 0 → `game:over` emit → ResultModal 표시 확인
- 전체 명령어 완료 → `game:complete` → SUCCESS 결과 + 점수/등급 확인
- `game:restart` → atom 전체 초기화 확인
