# 튜토리얼 재구성

네 차례에 걸친 튜토리얼 재정비 — (1) 12단계 기본 구조 + 아이템 사용 제한, (2) BE 연동·오버레이 리팩토링·완료 연출·a11y, (3) 13단계 확장 + miss 유도 + cherry-pick race condition 수정, (4) step 메타 단일 truth source 통합.

각 작업 단위마다 `Background/Context` · `Decision`을 필수로 두고, 의사결정 근거(`Why`)와 주의사항(`Caution`), 검증 절차(`Test Plan`)를 함께 기록한다.

---

## 1차 — 12단계 기본 구조 + 아이템 사용 제한

### Background / Context

기존 튜토리얼의 누적된 UX/구현 부채를 해결.

- BRANCH_MISMATCH 단계에서 "입력하라고 해놓고 틀렸다"는 모순적 UX. 튜토리얼은 `difficulty: 'EASY'` → `requiresManualSwitch=false`라 입력 즉시 성공 처리되어 explanation의 "틀렸어요!" 피드백과 충돌.
- 튜토리얼 도중 아이템을 아무 때나 사용 가능. ITEM_USE 단계 외 사용은 진행을 깨뜨림.
- DEMO / force-miss / SHOW_COMMAND_STEP 등 사용하지 않는 분기·상수가 코드 전반에 남아 있음.
- 아이템 획득 explanation에 git 명령어 설명이 없어 학습 효과 ↓.
- explanation의 `\n`이 화면에서 줄바꿈으로 처리되지 않음.

### Decision

12단계 + ITEM_USE 단계에서만 아이템 사용 가능한 구조로 재정비.

| Step | Behavior | Title | 비고 |
|------|----------|-------|------|
| 1 | INFO | 고양이의 도움 | StartModal 커버 |
| 2 | INFO | 목숨과 콤보 | highlight: hud-lives, hud-combo |
| 3 | PRACTICE | git add 명령어 | `git add .` |
| 4 | INFO | 히스토리 & 츄르 | highlight: history, cat-churu |
| 5 | PRACTICE | 기록으로 남기기 | `git commit` (cherry-pick drop) |
| 6 | PRACTICE | 원격에 올리기 | `git push origin main` (restore drop) |
| 7 | PRACTICE | 새 브랜치 만들기 | `git switch -c feat/escape` (stash drop) |
| 8 | ITEM_USE | cherry-pick 사용 | slot 1, SHOW_COMMAND, highlight: item-slot |
| 9 | INFO | git switch 설명 | 개념만 |
| 10 | ITEM_USE | restore 사용 | slot 2, highlight: item-slot |
| 11 | PRACTICE | 새 기능 커밋 | `git commit -m "feat: ..."` |
| 12 | PRACTICE | 마지막 푸시 | `git push origin main` |

**아이템 사용 제한**: 신규 `tutorialItemAllowedSlotAtom`(0|1|2|null). `enterStep` 진입 시 null 초기화, ITEM_USE case에서만 `TUTORIAL_ITEM_USE_SLOT[stepIndex]` 값 설정. `useItemSlots`가 `applyItemSlot` 가드에서 `useSingleStore.getState().isTutorial && allowedSlotRef.current !== slotIndex`이면 차단.

**BRANCH_MISMATCH → cherry-pick UX 교체**: step 8을 ITEM_USE(cherry-pick)로 변경. 직접 입력 대신 아이템으로 처리하도록 유도. step 9는 git switch 개념 설명 INFO로 단순화.

**explanation 보강**: step 5/6/7에 cherry-pick/restore/stash 설명 추가.

**줄바꿈 렌더링**: `TutorialOverlay.tsx` explanation `<p>`에 `whitespace-pre-line` 적용.

**history 하이라이트**: step 4 진입 시 `<CommandInput />`을 highlight wrapper로 감싸 노란 ring 표시.

### Why

- BRANCH_MISMATCH 본래 의도(다른 브랜치 이동 학습)는 step 9 INFO + step 8 cherry-pick UX 분리가 더 자연스러움 — "직접 이동" vs "아이템으로 자동 처리" 양쪽을 명시적으로 노출.
- 아이템 사용 제한은 atom + ref 패턴으로 `useEffect` 재생성을 피하면서 `react-hooks/refs` lint를 만족. effect 안에서 ref를 업데이트해야 lint 통과.

### Caution

대량 dead code 제거가 동반됨. 외부에서 이 이벤트/상수에 의존하던 코드는 없었으나, 향후 부활 시 git history 참조 필요.

- **상수·타입**: `TUTORIAL_DEMO_BRANCH`, `TUTORIAL_DEMO_FALL_DURATION_MS`, `TUTORIAL_DEMO_PAUSE_MS`, `TUTORIAL_SHOW_COMMAND_STEP`, `TUTORIAL_FORCE_MISS_AFTER_STEPS`. `TutorialStepBehavior`에서 `'DEMO'`, `'BRANCH_MISMATCH'` 제거. `TutorialCommand.explanation` optional 변경(2차에서 nullable로 추가 확장).
- **도메인 이벤트**: `tutorial:demo-enter` / `tutorial:demo-exit` / `tutorial:demo-command` / `tutorial:demo-resume-fall` / `tutorial:force-miss` 제거(3차에서 force-miss 패턴은 다른 형태로 부활).
- **훅·컴포넌트**: `useTutorialMode`의 DEMO·BRANCH_MISMATCH switch case, `handleCommandComplete` BRANCH_MISMATCH 분기, `handleCommandMiss` 핸들러, DEMO·BRANCH_MISMATCH freeze/resume-fall useEffect, `handleNext`의 forced-miss 분기. `useGameLives`의 demo 구독 + `isDemoActiveRef`, force-miss 구독, command:miss DEMO 예외. `TutorialOverlay`의 `demo` / `forced-miss` phase 렌더 블록, explanation 단계 `isBranchMismatch` 빨간 헤더. `TutorialPage`의 `TUTORIAL_DEMO_BRANCH` import, `extractCommandSet`의 DEMO·BRANCH_MISMATCH branchName 분기.
- **Phaser Scene**: `SingleScene`의 `isDemoModeActive`, `handleTutorialDemoEnter/Exit/Command/ResumeFall`, `onCommandTimeout`의 DEMO 예외. `BranchLane`의 `resumeFallToBottom` (DEMO 전용).

### Test Plan

- `npx tsc --noEmit` / `npx eslint` (react-hooks/refs 포함) 통과.
- 12 step 구조로 commandSet 7개(non-SWITCH) → churu 7칸 일치.
- 아이템 인벤토리 정합성: 5/6/7에서 cherry-pick/restore/stash 획득 → 8/10에서 cherry-pick/restore 소모.
- step 8에서 cherry-pick 아닌 슬롯 클릭 시 차단되는지.
- explanation `\n` 줄바꿈이 렌더에서 보존되는지.

### 변경된 파일

**신규**
- `src/features/single/store/tutorialItemAllowedSlotAtom.ts`

**수정**
- `src/features/single/constants/tutorialData.ts`, `bridge/singleBus.ts`, `dev/tutorial.mock.json`, `hooks/useTutorialMode.ts`, `hooks/useGameLives.ts`, `hooks/useItemSlots.ts`, `components/TutorialOverlay.tsx`, `components/TutorialPage.tsx`, `components/SingleGameContent.tsx`, `scenes/SingleScene.ts`, `scenes/BranchLane.ts`
- `src/shared/types/tutorial.types.ts`

---

## 2차 — BE 연동 · 오버레이 리팩토링 · 완료 연출 · a11y (2026-05-18)

### Background / Context

1차 구조가 안정화된 후 누적된 UX 피드백/리뷰 반영.

- BE의 `GET /api/v1/tutorial` 응답이 사용 가능해지면서 mock 의존 제거. 응답에는 `"explanation": null` 케이스 포함.
- step 4 → 5 진입 시 어두운 배경이 잠시 끊겨 깜빡거리는 현상.
- step 진입마다 카드가 위에서 슬라이드되며 자리잡는 모션이 산만함.
- 아이템 슬롯 highlight ring이 nes.css 보더 안쪽에 깔려 보임.
- 튜토리얼 완료 시 single 모드와 달리 탈출 연출이 없어 일관성 결여.
- `TutorialOverlay`가 220줄 단일 컴포넌트 + `useEffect` 3개로 비대.
- explanation phase가 시각적 모달인데 `role="dialog"`/aria 누락 (컨벤션 §19 위반).

### Decision

대규모 변경 9건을 일괄 진행.

1. **BE API 연동 + `explanation` nullable**
   - `-TutorialRoute.tsx`의 `onFetchSteps`를 `onboardingApi.getTutorialSteps()`로 복원.
   - `TutorialCommand.explanation`을 `string | null | undefined`로 확장, zod `z.string().nullish()`.

2. **description 블러 derived state — `useTutorialDescriptionBlur`**
   - `blurDoneStepIndex` state 하나로 `blurActive = phase === 'description' && blurDoneStepIndex !== stepIndex` derived.
   - dim transition을 `blurActive=false` 분기에만 적용(진입은 즉시, 해제는 0.5s 부드럽게). 색상을 `bg-black/45` → `bg-black/50`으로 `TutorialSpotlight`와 통일.

3. **키 입력 통합 hook — `useTutorialOverlayKeys`**
   - description Enter(스킵)/info·explanation Enter(다음)를 phase 분기로 처리. 50ms guard 유지.

4. **`useTutorialMode`에 end-screen 책임 흡수**
   - 신규 `tutorialEndScreenWatchedAtom` 읽기/쓰기를 hook이 단독 소유.
   - `showEndScreen` / `showCompletedModal` / `showSkippedModal` derived flag + `handleEndScreenDone` 노출.

5. **`TutorialOverlay` phase 컴포넌트 분리**
   - 같은 파일 내부 4개 함수 컴포넌트(`TutorialInfoCard` / `TutorialDescriptionLayer` / `TutorialItemUseCard` / `TutorialExplanationModal`) + 공통 `StepProgressBar`(in-progress / completed variant) 추출.
   - 본체 effect 0개, 분기/wiring만 책임.

6. **explanation a11y — `useModal` 적용**
   - `role="dialog"` / `aria-modal="true"` / `aria-labelledby` / `tabIndex={-1}` 부여.
   - 컨테이너 자동 포커스 + Tab focus trap + body scroll lock은 `useModal`이 처리. ESC는 진행 전용 모달이라 비활성(`onClose` 미전달).
   - 기존 `nextBtnRef.current?.focus()` 자동 포커스 제거 — §19 "첫 focusable 직행 금지" 정책 준수.

7. **`HighlightRing` 헬퍼 — highlight ring 패턴 통일**
   - 활성 시 `<div className="absolute -inset-2 ring-2 ring-yellow-400 rounded pointer-events-none" />` absolute 오버레이 + wrapper `z-20`.
   - 적용 대상: `hud-lives`, `hud-combo`, `item-slot`, `history`, `cat-churu`.

8. **튜토리얼 완료 시 single 탈출 연출 재사용**
   - `modalPhase === 'completed'` 진입 시 `GameEndScreen status="SUCCESS"`(EscapeAnimation → `Game_Success.mp4`) → `onVideoEnd`에서 atom toggle → `TutorialCompleteModal` 전이.
   - 스킵 흐름은 영상 없이 바로 모달.
   - `churuRatio`는 SUCCESS에서 무시되므로 prop 미전달. `onVideoEnd` / `onHome`은 `useCallback` 안정화.

9. **카드 슬라이드인 애니메이션 제거**
   - `index.css`의 `@keyframes tutorial-bubble-in` + `.tutorial-bubble-wrap` rule 제거. JSX의 클래스 4개소도 함께 제거.

### Why

- 블러 derived state는 useState 초기값 + setTimeout race를 우회하고 첫 frame부터 올바른 상태가 보장됨(React 권장 패턴).
- end-screen 책임을 hook이 단독 소유하면, phase 정책이 한 곳에 모여 추후 phase 추가/이벤트 변경 시 컴포넌트와 hook 두 곳을 동시에 손대지 않아도 됨.
- explanation의 `nextBtnRef.focus()` 자동 포커스는 컨벤션 §19의 "직전 keydown key-repeat이 흘러들어가 자동 click을 유발" 안티패턴. 컨테이너 포커스 + Tab 1회로 대체.
- `HighlightRing`의 `-inset-2` absolute 오버레이는 layout/크기에 영향 0 — nes-btn 보더 두께(약 4px) 바깥까지 자연스럽게 감쌈. `lanes` 예외 사유는 Caution 참조.

### Caution

- **lanes wrapper 예외**: Phaser canvas + `overflow-hidden` + `ref` 특수성으로 `-inset-2` absolute 오버레이가 잘리고 grid track 보존 필요. wrapper ring 방식 유지 + 주석으로 사유 명시.
- **SUCCESS 하드코딩**: 튜토리얼은 `useTutorialMode`가 게임 오버 phase를 갖지 않음(`'paused'`/`'completed'`/`'skipped'`만). 마지막 step 도달 = SUCCESS이므로 `GameEndScreen status="SUCCESS"` 고정. 향후 튜토리얼 게임 오버 도입 시 분기 필요.
- **atom 초기화**: `tutorialEndScreenWatchedAtom`은 jotai `<Provider>` 안이라 TutorialPage 마운트마다 자동 초기화 → 별도 리셋 코드 불필요.

### Test Plan

- `npx tsc --noEmit` / `npx eslint` 변경 파일 통과.
- step 4 → 5 진입 시 어두운 배경 끊김/페이드인 없이 즉시 어두움.
- step 8/10 진입 시 노란 ring이 nes-btn 보더 바깥을 감쌈. 슬롯 크기/위치 변동 없음.
- step 마지막 explanation에서 Tab 포커스가 모달 안에 갇히는지, Enter로 정상 진행.
- 마지막 step 도달 → EscapeAnimation → 영상 → 완료 모달 → 홈.
- 스킵 시 영상 없이 바로 'TUTORIAL SKIPPED' 모달.
- BE 응답 `"explanation": null` 통과 시 zod parse 에러 없음.

### 변경된 파일

**신규**
- `src/features/single/store/tutorialEndScreenAtom.ts`
- `src/features/single/components/HighlightRing.tsx`
- `src/features/single/hooks/useTutorialDescriptionBlur.ts`
- `src/features/single/hooks/useTutorialOverlayKeys.ts`

**수정**
- `src/routes/-TutorialRoute.tsx`, `src/features/auth/schemas/onboarding.schema.ts`, `src/shared/types/tutorial.types.ts`
- `src/features/single/hooks/useTutorialMode.ts`, `components/TutorialOverlay.tsx`, `components/SingleHUD.tsx`, `components/SingleGameContent.tsx`
- `src/index.css`

**삭제**
- `src/features/single/dev/tutorial.mock.json` (3차에서 재도입)

---

## 3차 — 13단계 확장 + miss 유도 + cherry-pick race condition 수정

### Background / Context

팀 리뷰에서 식별된 잠재 버그 및 UX 보완.

- **race condition**: step 8 cherry-pick의 `command:complete`가 `CHERRY_PICK_ANIM_MS` 후 emit되는데, 그 사이 사용자가 step 9 → 10 → 11로 빠르게 진행하면 늦게 도착한 `command:complete`가 step 11 PRACTICE를 explanation으로 강제 전환 → 사용자 입력 없이 step 통과.
- **step 8 "다른 레인" UX 모순**: `extractCommandSet`은 step 7 `git switch -c feat/escape` 이후 `currentBranch='feat/escape'`로 바꾸고 step 8 명령어도 그 레인에 push. BE description "다른 레인에서 명령어가 떨어지고 있어요!"와 실제 동작 불일치.
- **restore 아이템 무효화**: 사용자가 step 10에 도달했을 때 lives는 항상 max(3). restore 사용해도 시각적 변화 없음 → 학습 효과 ↓.

### Decision

후반부(step 8~13)를 cherry-pick → push → switch → merge 워크플로우로 재정렬. step 9의 git switch 설명 INFO가 PRACTICE switch로 격상되고, 마지막 명령은 merge로 바뀜.

1. **BE 응답 변경 (BE 팀 전달 후 반영 완료)** — BE에 13단계 응답으로 수정 요청 → 적용 완료.
   - step 8 description에서 "다른 레인" 문구 제거 + 명령어를 `git commit -m 'feat: implement escape module'`로 변경 (cherry-pick으로 처리).
   - **step 9 신규 PRACTICE**: `git push origin feat/escape`.
   - **step 10 신규 PRACTICE**: `git switch main` — 기존 step 9 switch INFO를 실제 명령어 처리 단계로 격상.
   - **step 11 신규 INFO** "명령어를 놓쳤어요!" — 기존 step 10 자리에서 한 칸 밀림.
   - **step 12 ITEM_USE restore** — 기존 step 11.
   - **step 13 PRACTICE 탈출**: `git merge feat/escape` — 기존 step 12 commit + step 13 push가 새 step 8의 cherry-pick 처리로 흡수되었고, 마지막은 merge로 master 통합.
2. **FE `tutorialData.ts` 매핑 재조정**
   - `TUTORIAL_STEP_BEHAVIOR`: step 9/10 = `'PRACTICE'`, step 11 = `'INFO'`, step 12 = `'ITEM_USE'`, step 13 = `'PRACTICE'`.
   - `TUTORIAL_ITEM_USE_SLOT`: `{8: 1, 12: 2}`.
   - `TUTORIAL_HIGHLIGHT_TARGETS`: step 11 = `['hud-lives']`, step 12 = `['item-slot']`.
   - `TUTORIAL_FORCE_MISS_STEPS = [11]`.
3. **cherry-pick race condition 수정 — pending 패턴**
   - `itemUsePendingStepRef` 신설. `handleItemUse`가 ITEM_USE && SHOW_COMMAND이면 pending 기록만, 즉시 enterStep 안 함.
   - `handleCommandComplete`가 pending과 같은 stepIndex이면 `setHighlight([])`(spotlight dim 제거) + explanation phase 진입. 사용자가 해설 모달에서 Enter 누르면 그때 `enterStep(+1)`. pending은 이 시점에 클리어.
   - `handleSkip`에서도 pending 클리어(스킵 후 늦게 도착하는 이벤트 방어).
4. **force-miss 트리거**
   - `enterStep` 진입 시 `TUTORIAL_FORCE_MISS_STEPS.includes(stepIndex)`이면 `setLives((l) => Math.max(0, l - 1))`.
5. **임시 mock 사용 → 정리**
   - 검증용 `tutorial.mock.json` 재도입 후, BE 반영 완료 시점에 파일 삭제 + `-TutorialRoute.tsx`의 `onFetchSteps`를 `onboardingApi.getTutorialSteps()`로 복원.

#### 최종 13단계 표

| Step | Behavior | Title | 명령어 / 비고 |
|------|----------|-------|---------------|
| 1 | INFO | 고양이의 도움 | StartModal 커버 |
| 2 | INFO | 목숨과 콤보 | highlight: hud-lives, hud-combo |
| 3 | PRACTICE | git add 명령어 | `git add .` |
| 4 | INFO | 히스토리 & 츄르 | highlight: history, cat-churu |
| 5 | PRACTICE | git commit / stash | `git commit -m 'chore: ...'` (cherry-pick drop) |
| 6 | PRACTICE | git push / restore | `git push origin main` (restore drop) |
| 7 | PRACTICE | git switch -c / stash | `git switch -c feat/escape` (stash drop) |
| **8** | **ITEM_USE** | **cherry-pick 사용** | **slot 1, SHOW_COMMAND, `git commit -m 'feat: implement escape module'`, highlight: item-slot** |
| **9** | **PRACTICE** | **git push** | **`git push origin feat/escape`** |
| **10** | **PRACTICE** | **git switch** | **`git switch main`** |
| **11** | **INFO** | **명령어를 놓쳤어요!** | **lives -1, highlight: hud-lives** |
| **12** | **ITEM_USE** | **restore 사용** | **slot 2, highlight: item-slot** |
| **13** | **PRACTICE** | **탈출!** | **`git merge feat/escape`** |

### Why

- **pending 패턴 vs index 매칭**: `command:complete` payload의 `index`로 stale event를 분별하는 방안도 검토. 그러나 useTutorialMode가 commandIndex를 직접 추적하지 않으므로 의존성이 늘어남. pending 패턴은 ITEM_USE+SHOW_COMMAND 흐름에만 한정된 가드라 변경 면적이 작고 race도 본질적으로 해소(사용자가 cherry-pick 완료 전까지 step 8에 머무름).
- **force-miss 이벤트 부활 vs 직접 setLives**: 1차에서 `tutorial:force-miss` 이벤트를 제거했으나 이번엔 도메인 이벤트 부활보다 `useTutorialMode`가 `livesAtom`을 직접 set하는 단순 경로를 선택. miss 트리거 지점이 `enterStep` 한 곳뿐이고, 이벤트 구독자가 외부에 없으므로 직접 setter가 가독성/추적성 더 좋음.
- **새 step description은 BE가 소유**: lives 차감 안내를 클라이언트 분기로 끼우는 대신 BE step description으로 일관 — UX 문구의 단일 진실 소스 유지.

### Caution

- **`TUTORIAL_STEP_BEHAVIOR` 키가 BE step.order에 의존**: BE가 step을 추가/삭제하면 모든 step-order 기반 매핑(behavior, highlight, item slot, force-miss, item drop)을 동시에 갱신해야 함. 4차에서 `TUTORIAL_STEPS_META` 단일 객체로 통합되어 한 곳만 수정하면 됨.
- **race condition은 ITEM_USE + SHOW_COMMAND 한정**: SHOW_COMMAND가 아닌 ITEM_USE(예: step 11 restore)는 명령어 처리가 없어 즉시 enterStep로 OK. SHOW_COMMAND 목록이 늘어나면 자동으로 같은 가드가 적용됨.
- **handleSkip 후 늦게 도착하는 command:complete**: `overlayStateRef.current = null` + `itemUsePendingStepRef.current = null`로 두 ref를 동시에 정리 — pending 가드와 PRACTICE 분기 모두 short-circuit.

### Test Plan

- `npx tsc --noEmit` / `npx eslint` 통과.
- step 8 cherry-pick 사용 → 애니메이션 완료 전엔 step 9로 넘어가지 못함. 완료되면 explanation 모달이 뜨고, Enter로 step 9 진입.
- step 8 explanation 진입 시 다른 PRACTICE step의 해설과 동일한 어둡기(item-slot spotlight + 모달 dim 중첩 없음).
- step 11 진입 즉시 lives 한 칸 감소, 노란 ring이 hud-lives에 표시.
- step 12에서 restore(slot 2) 사용 → lives 회복(3으로 복구) 시각 확인.
- (선택) step 8 cherry-pick 사용 직후 사용자가 ESC → 스킵하면 늦게 도착한 `command:complete`가 무시되는지(overlayState=null + pending=null 가드).
- BE 적용 후 실제 API 응답으로 처음부터 끝까지 통과 확인.

### 변경된 파일

**수정**
- `src/features/single/constants/tutorialData.ts` — step order +1 시프트, `TUTORIAL_FORCE_MISS_STEPS` 추가, `TUTORIAL_HIGHLIGHT_TARGETS`에 step 11(`hud-lives`)·step 12(`item-slot`) 신규
- `src/features/single/hooks/useTutorialMode.ts` — `livesAtom` setter import, `itemUsePendingStepRef` 신설, `enterStep`에 force-miss 트리거 + pending 패턴, `handleCommandComplete`에서 explanation 진입 시 `setHighlight([])`로 spotlight 제거, `handleSkip`에서 pending 정리
- `src/routes/-TutorialRoute.tsx` — BE 검증 동안 mock 임시 사용 후, BE 13단계 반영 완료로 `onboardingApi.getTutorialSteps()` 복원

> 참고: `src/features/single/dev/tutorial.mock.json`은 BE 명세 전달용으로 일시 재도입되었다가 BE 반영 완료 시점에 삭제됨.

---

## 4차 — step 메타 단일 truth source 통합

### Background / Context

3차까지 누적된 결과, `tutorialData.ts`가 step.order를 키로 하는 분리 맵 6종을 갖게 됨.

- `TUTORIAL_STEP_BEHAVIOR`, `TUTORIAL_ITEM_DROPS`, `TUTORIAL_ITEM_USE_SLOT`, `TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS`, `TUTORIAL_HIGHLIGHT_TARGETS`, `TUTORIAL_FORCE_MISS_STEPS`.
- step 1개 추가/이동이 곧 6곳 동시 수정. 3차에서 실제 일부 entry를 빠뜨려 문서/코드 어긋남을 만들었음(이번 정정 트리거).

### Decision

`TUTORIAL_STEPS_META: Record<number, TutorialStepMeta>` 단일 객체를 도입하고, 기존 6개 export를 이 객체로부터 derive하도록 변경. 사용처(`TutorialPage.tsx`, `useTutorialMode.ts`)는 그대로.

```ts
interface TutorialStepMeta {
  behavior: 'INFO' | 'PRACTICE' | 'ITEM_USE';
  highlight?: TutorialHighlightTarget[];
  itemUseSlot?: 0 | 1 | 2;
  showCommand?: true;   // ITEM_USE에서 command 노드 표시
  forceMiss?: true;     // 진입 시 lives -1
  itemDrop?: 'restore' | 'stash' | 'cherry-pick';
}
```

`buildRecord` / `buildList` 헬퍼 2개로 6개 derived export를 생성. module-scope 한 번 평가.

### Why

- step 추가/이동 시 META의 한 entry만 손대면 됨. 분리 맵 누락 휴먼 에러 차단.
- 사용처 시그니처(`TUTORIAL_STEP_BEHAVIOR[stepIndex]` 등) 무변경 — 변경 면적 최소.
- derived 방식: META를 export하지 않고 6개만 export하는 대안도 있었으나, 미래 확장(예: step별 commandSet 산출 분기, BE branchName override 등)을 같은 객체에 얹기 쉬워 META 자체도 export.

### Caution

- `Object.entries(TUTORIAL_STEPS_META)`의 키는 문자열이므로 derive에서 `Number(k)` 변환 필수. 헬퍼가 이를 담당.
- META에 entry를 추가하면 derived map/list가 자동 갱신. 반대로 META에서 entry를 빠뜨리면 derived에도 누락 — META가 단일 진실 소스라는 사실을 주석으로 명시.

### Test Plan

- `npx tsc --noEmit` / `npx eslint src/features/single/constants/tutorialData.ts src/features/single/hooks/useTutorialMode.ts src/features/single/components/TutorialPage.tsx` 통과.
- 13 step 전 구간 진입 — 사용처 코드는 변경하지 않았으므로 회귀 가능성 없으나, 시각 확인 시 step 11 force-miss / step 12 restore highlight 등이 이전과 동일하게 동작.

### 변경된 파일

**수정**
- `src/features/single/constants/tutorialData.ts` — `TUTORIAL_STEPS_META` 신설, 6개 export를 derive 형태로 재작성, `TutorialStepMeta`/`TutorialItemKind`/`TutorialItemSlot` 타입 추출.
