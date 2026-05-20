# Single_IMPLEMENTATION_점수리밸런스_및_예측등급

## Background / Context

기존 점수 체계는 콤보 보너스가 `maxCombo × 50` 선형이고 `idealTimeSec`이 EASY 75 / NORMAL 110 / HARD 90초로 느슨해, "충분히 빨리 친 플레이"와 "평균 페이스 플레이"의 점수 차가 거의 없었다. 콤보를 끝까지 끌고 갈 한계 효용도 일정해 후반부에 콤보를 유지할 동기가 약했고, 결과 모달 전에는 종료 시점 등급을 가늠할 수단이 전혀 없어 진행 중 피드백이 부재했다.

또한 EASY는 commandSet에 SWITCH 명령어가 포함된 유일한 난이도인데, churu 카운트와 totalCommands 계산이 `c.type !== 'SWITCH'` 일괄 필터로 박혀 있어 EASY만 totalCommands가 실제보다 1 작게 잡혀 점수 임계치(`churuCount × 0.75`) 산정이 잘못된 상태였다. NORMAL/HARD는 commandSet에 SWITCH가 없어 영향이 없었다.

마지막으로 restore 아이템으로 lives를 회복하면 `lives`는 올라가지만 누적 손실은 그대로여야 하는데, 기존엔 누적 손실이 ref로만 관리돼 React 컴포넌트에서 reactive하게 읽을 수 없는 상태였다. 예측 등급 외삽에 누적 손실이 필요해지면서 reactive 노출이 필수가 됐다.

---

## Decision

### 1. 점수 공식 재정의 — `features/single/utils/scoreCalculator.ts`

- **콤보 보너스**: 선형(`maxCombo × 50`) → 누진식(`5·N·(N+1)`). 콤보 레벨 k 달성 시 +10k 누적 ⇒ N까지 도달 시 `10·(1+2+…+N) = 5·N·(N+1)`.
- **초과 churu 단가**: 200 → 500점/개.
- **`idealTimeSec` 단축**: EASY 75→35 / NORMAL 110→55 / HARD 90→80. 시간 감점 압박 강화.
- **`MAX_SCORE` → `BASE_SCORE` 리네임**. 보너스 합산 시 10,000 초과 가능함을 명시 (EASY 13콤보 퍼펙트 ≈ 12,410).
- **`isScoringCommand(cmd, difficulty)` / `countScoringCommands(commandSet, difficulty)` 헬퍼 추출**. churu 카운트 규칙을 단일 정의로 모음.

### 2. EASY churu 카운트 규칙 통일

```ts
export function isScoringCommand(cmd: Pick<Command, 'type'>, difficulty: Difficulty): boolean {
  return difficulty === 'EASY' || cmd.type !== 'SWITCH';
}
```

세 곳에서 동일 규칙 사용:
- `useGameScore.ts` — churu 증분 + commandTimestamps push.
- `useGameLifecycle.ts` — `game:complete` / `game:over` 시 totalCommands 산정.
- `useGradePrediction.ts` — 예측 시 totalCommands 산정.

### 3. 예측 등급 훅 — `features/single/hooks/useGradePrediction.ts`

| 지표 | 처리 방식 |
|------|----------|
| 속도(C) | 최근 `ROLLING_WINDOW=5`개 scoring 명령어 인터벌 평균. 직전 명령어 이후 침묵 시간이 평균보다 크면 그 값 채택(`Math.max(rollingAvg, sinceLast)`) |
| 시간(A) | `elapsedMs + remaining × avgMsPerCmd` |
| churu(A) | "현재 페이스로 완주" 가정 → `churuCount = totalCommands` |
| typo/lives 외삽(B) | `Math.round(현재값 × totalCommands / churuCount)`. 같은 페이스로 끝까지 발생한다 가정 |
| 콤보 | 보수적으로 현재 `maxCombo` 그대로 (콤보는 끊길 수 있어 낙관 가정 위험) |
| 가드 | `gameStatus !== 'playing'` / `churuCount < 3` / `totalCommands === 0` 중 하나면 null. `predictedLivesLost ≥ MAX_LIVES` 면 즉시 'F' |

useMemo 의존성: `elapsedMs / typoCount / livesLost / churuCount / maxCombo / gameStatus / difficulty / commandSet / commandTimestamps`.

### 4. 신규 atom 3종 (atom 단위 파일 분리, FE 컨벤션 §15)

- **`commandTimestampsAtom.ts`** — scoring `command:complete` 발생 시점의 `elapsedMs`를 ring buffer로 보관(최근 5개). 게임 종료/리셋 시 빈 배열로 초기화.
- **`livesLostAtom.ts`** — 누적 lives 손실. restore 아이템 회복과 무관하게 단조 증가. 점수 감점·예측 등급 외삽 모두 이 값 사용.
- **`maxComboAtom.ts`** — 게임 중 도달한 최대 콤보. 예측 등급에서 reactive하게 읽을 수 있도록 ref → atom 승격(ref도 그대로 유지해 finishGame에서 동기 read).

### 5. HUD — `features/single/components/HUDCombo.tsx`

기존 콤보 카운트 옆에 "예측 등급" 칸 추가. `useGradePrediction()`이 null이면 `-` 표시, 등급이 잡히면 nes-text style.

---

## Why

### 콤보 보너스를 누진식으로 바꾼 이유

선형 `maxCombo × 50`은 10콤보부터든 30콤보부터든 한 콤보 더 쌓는 한계 효용이 동일해 후반 콤보 유지 동기가 약했다. 누진식 `5·N·(N+1)`은 10→11에서 +110, 20→21에서 +210으로 한계 효용이 콤보가 커질수록 증가한다. "여기서 끊기면 손해가 크다"는 압박이 콤보 단계별로 증가해 후반까지 끌고 갈 동기가 생긴다.

### `idealTimeSec`을 대폭 단축한 이유

기존 idealTime은 "여유 있게 끝낼 수 있는 시간"이라 시간 감점이 거의 발생하지 않고 S 등급이 보너스 없이도 쉽게 나왔다. 단축된 값은 "퍼펙트 플레이를 한 사람만 시간 감점 0"이 되는 기준이라, 일반 플레이는 시간 감점을 받아 보너스(콤보/churu)로 S 등급을 노려야 하는 구조가 된다. 점수 분포의 변별력 확보가 목적.

### EASY에서 SWITCH를 scoring 명령어로 포함시킨 이유

`commandSet.filter(c => c.type !== 'SWITCH').length`는 NORMAL/HARD 기준 코드인데 EASY에도 그대로 적용돼 있었다. EASY는 SWITCH가 정상 명령어로 commandSet에 들어가고 사용자가 직접 입력해야 진행 가능하므로, 같은 입력 노력에 대한 churu 보상이 다른 명령어와 동일해야 일관적이다. 정정 성격.

### `livesLostAtom`을 별도 atom으로 둔 이유

`lives` 값만 보면 `MAX_LIVES - lives = currentMissingLives`인데 이것은 "현재 부족한 lives"지 "누적 손실"이 아니다. restore 아이템 사용 후엔 두 값이 어긋난다. 점수 감점(`livesLost × livesPenalty`)과 예측 등급 외삽은 "누적 손실"이 기준이라 두 값을 분리 보관해야 한다.

### `maxCombo`를 ref에서 atom으로 승격시킨 이유

예측 등급은 React 훅에서 useMemo deps로 동작해야 하고, 값 변경 시 재계산이 트리거되어야 한다. ref는 변경 시 re-render를 유발하지 않으므로 reactive deps로 쓸 수 없다. finishGame 시점에는 여전히 ref에서 동기 read(기존 score atom들과 동일한 ref+atom dual 패턴).

### timestamp push를 `isScoringCommand` 분기 *안*으로 둔 이유

`useGradePrediction`에서 `remaining = totalCommands - churuCount`는 scoring 명령어 단위 잔여 수다. avgMsPerCmd가 모든 명령어 인터벌(SWITCH 포함 가능)이면 단위 불일치가 생긴다. push와 churu 증분을 같은 분기 안에 묶으면 timestamps와 churuCount가 항상 1:1 대응되어 의미가 일관된다.

### 침묵 시간을 `Math.max`로 반영한 이유

rolling 평균만 쓰면 "5개 친 후 손 멈춤" 시 평균이 천천히 올라가 등급 강하가 지연된다. `Math.max(rollingAvg, sinceLast)`는 침묵 시간이 평균을 초과하는 즉시 그 값을 채택해, 손 멈춤이 등급에 1초 단위로 반영된다.

### setter 업데이터 안에서 외부 atom을 읽지 않은 이유

`setCommandTimestamps((prev) => { const now = store.get(elapsedTimeAtom); … })` 형태는 updater가 비순수해진다. Jotai/React 양쪽 모두 set updater를 순수 함수로 다루기를 권장하고, 동시 batch 시 재실행될 여지가 있어 같은 명령어가 다른 timestamp로 push될 가능성이 생긴다. `now`를 setter 호출 *직전*에 캡처해 closure로 넘긴다.

---

## Caution

- **점수 회귀 영향**: `idealTimeSec` 단축으로 기존 플레이 점수가 평균 수백 점 단위로 감소. 결과 모달 표시는 그대로지만 사용자 입장에서 "갑자기 등급이 낮아졌다"는 경험 가능. 패치 노트 등 사전 안내 권장.
- **EASY threshold 1 증가**: SWITCH가 scoring으로 카운트되면서 totalCommands +1 → `ceil(totalCommands × 0.75)` 도 +1. 예: 13개 기준 9→10. 회귀가 아닌 정정이지만 ESCAPE_FAILED 임계가 약간 올라감.
- **`predictedLivesLost ≥ MAX_LIVES` 즉시 'F'**: 초반 페이스로 외삽하므로 churuCount=3 시점에 livesLost=2면 scaleToFinish=4.33 → predicted=8.66 → 'F'. 의도된 "현 페이스로 가면 게임오버" 신호이지만 사용자에겐 가혹하게 보일 수 있음. 이후 회복으로 등급은 다시 올라감.
- **예측 등급의 비가역성 부재**: 등급이 떨어졌다 다시 올라갈 수 있어 사용자 혼란 가능. "예측" 라벨로 의도 명시했지만 강하/회복 모두 빠르게 일어남.
- **commandTimestamps push 단위 변경 시 동시 점검**: 현재 scoring 명령어와 1:1. SWITCH 정책이 다시 바뀌면 `useGameScore`의 push 위치(isScoringCommand 분기 안)도 함께 검토.
- **`useGameLifecycle`의 `!difficulty` 가드**: TS narrowing 용 방어. runtime상 `game:complete`가 difficulty 미설정 상태로 도달할 일은 없음 (start → playing → complete 흐름에서 보장). 주석으로 명시.
- **튜토리얼**: lifecycle은 `isTutorial`로 finishGame을 건너뛰지만 예측 등급 훅은 `gameStatus === 'playing'`만 본다. 튜토리얼에서 HUDCombo가 노출되지 않는 것이 전제 — 노출되면 의미 없는 등급이 표시될 수 있어 표시 컨텍스트 확인 필요.

---

## Test Plan

### 단위 테스트

- `npx vitest run scoreCalculator` — 기존 30개 + 신규 2개(누진 콤보 보너스 / EASY 퍼펙트 13콤보) = 32개 통과.
- `tsc --noEmit` / `eslint src/` / `npm run build` 통과.

### 수동 회귀 시나리오

1. **EASY 시작 → 3개 친 직후**: HUD에 예측 등급 표시 시작.
2. **5개 친 후 손 멈춤**: rolling 평균에 침묵 시간이 반영돼 등급이 즉시 떨어지는지.
3. **restore 아이템 사용으로 lives 회복**: `livesLost` atom이 유지돼 예측이 낙관 편향 없는지.
4. **게임 종료(SUCCESS / ESCAPE_FAILED)**: 결과 모달 등급과 마지막 예측 등급 격차가 작은지.
5. **EASY 퍼펙트 클리어** (오타 0, 사망 0, 13개 전부, idealTime 35초 안): ≈ 12,410점 = (10,000 - 시간감점 0) + churu 보너스 1,500 + 콤보 보너스 910.
6. **NORMAL/HARD 회귀**: commandSet에 SWITCH가 없으므로 totalCommands/threshold/churu 증분이 기존과 동일해야 함.

### 배포 후 확인 포인트

- 예측 등급 표시가 일반 플레이 흐름에서 의도된 빈도로 변하는지 (튀는 빈도가 너무 잦지 않은지).
- `idealTimeSec` 단축이 사용자 체감상 적절한지 — 평균 EASY 클리어 시간이 35초 근처에 분포하는지 분석 로그로 확인.

---

## 후속 작업

- **점수 보너스 단가(`CHURU_BONUS_PER`, `COMBO_BONUS_PER`)와 `idealTimeSec` 매직 넘버 통합**: 향후 BE 합의로 난이도별 grade 임계값을 더 세밀히 조정하면 `SCORE_CONFIG`에 묶어 관리.
- **예측 등급 트랜지션·강조 효과**: 등급 변화 시 부드러운 트랜지션, 강하 시 시각 강조 등은 별도 PR.
- **튜토리얼에서 HUDCombo 노출 여부 점검**: 노출된다면 예측 등급 게이트에 `isTutorial` 분기 추가.
