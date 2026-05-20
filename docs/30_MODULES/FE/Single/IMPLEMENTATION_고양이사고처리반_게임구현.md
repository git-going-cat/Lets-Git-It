# 고양이 사고처리반 — 게임 구현

> 홈 화면 연결(Win11ExplorerModal / ScenarioSelectModal)은
> `IMPLEMENTATION_고양이사고처리반_게임타입추가.md` 참조.
> 이 문서는 `/incident` 라우트 이하 게임 자체의 구조와 설계 결정을 다룹니다.

---

## Background / Context

고양이 사고처리반은 git 실수 시나리오를 카드 단위로 풀어가는 스토리 모드다.
유저가 터미널 입력창에 git 명령어를 직접 타이핑하면, 채점기가 base / must / bonus
3계층으로 점수를 계산하고, git 상태 변화를 시각화(VizState)로 보여준다.

Phaser 없이 순수 React + Jotai로 구현했다. Single 모드와 독립된 도메인을 유지하기
위해 별도 이벤트 버스(`incidentBus`)와 독립 atom 세트를 사용한다.

---

## Decision

### 1. 레이아웃: IncidentPage → IncidentGame

```
/incident?scenarioId=N
  └─ IncidentPage          라우트 어댑터. retryCount state, key 주입
       └─ IncidentGame     게임 오케스트레이터. 모달 스택 + 레이아웃
            ├─ TopBar      시나리오 제목, 난이도, 카드 진행 표시
            ├─ NarrativeStrip  카드 상황 설명
            ├─ Visualization   git 상태 시각화 (VizState)
            ├─ InputRow    터미널 입력, 채점 결과, 액션 버튼
            └─ CatPanel    고양이 캐릭터, 멘토, 힌트, 도감/일시정지
```

`IncidentGame`은 `useIncidentGame` 훅 하나만 호출하고 나머지 훅들은 모두 내부에서
처리된다. 컴포넌트는 시각 렌더링과 모달 스택 관리만 담당한다.

### 2. 상태 관리: Jotai atoms + stateRef

| 종류 | 도구 | 이유 |
|------|------|------|
| 빈번히 업데이트되는 인게임 상태 (input, phase, history, viz 등) | Jotai atom (개별 파일) | 렌더링 최적화, 훅 간 구독 분리 |
| 채점·네비게이션 로직 내 동기 읽기 필요값 (cardIndex, input, phase, bestScore) | `stateRef` (MutableRefObject) | atom은 비동기 업데이트라 채점 콜백 내에서 stale할 수 있음 |
| 클리어 기록 (시나리오별 영구 보존) | Zustand + localStorage persist | 컴포넌트 unmount 후에도 유지 필요 |

**stateRef 패턴**: `useIncidentGame`이 생성한 `stateRef`를 하위 훅 전체에 주입한다.
각 훅은 atom을 set하는 동시에 `stateRef.current`도 동기화해 stale 읽기를 방지한다.

### 3. 이벤트 버스 (incidentBus)

훅 간 직접 의존 없이 단방향 흐름을 보장하기 위해 `TypedEventBus`를 사용한다.

```
useIncidentScore  ──emit 'card:graded'──▶  useIncidentVisualization  (fly 트랜지션)
useIncidentPhase  ──emit 'phase:idle'──▶   useIncidentVisualization  (viz 복원)
useIncidentNavigation ──emit 'card:next'──▶ useIncidentVisualization (다음 카드 viz)
```

이벤트 계약(`IncidentEventMap`)이 컴파일 타임에 강제되어 이벤트명 오타가 즉시 에러가 된다.

### 4. 카드·시나리오 데이터 구조

```
Scenario
  id, title, difficulty, synopsis, story
  cards: Card[]

Card
  id, scenarioId, stepIdx
  narrative        상황 설명 (NarrativeStrip 표시)
  canonical        정답 명령어 (답안/해설보기 시 표시)
  hint             힌트 텍스트 (정답 노출 금지, 방향 유도만)
  explanation?     mentor balloon 해설 (오답 후 답안보기 시)
  moodIdle/moodPerfect  고양이 말풍선 텍스트
  grade(raw)       채점 함수 → ScoreResult | null
  initialViz       카드 초기 VizState
  flyTransition?   정답 시 실행할 애니메이션 명세
  mockOutput?      정답 시 터미널에 표시할 가상 출력
```

시나리오·카드 데이터는 `constants/` 하드코딩. BE API 연동 시 교체.

### 5. 채점기 (grader) — base / must / bonus 3계층

```
ScoreStatus: perfect | accepted | partial | forbidden | wrong | lower-retry

점수 구조
  base  40pt  올바른 명령어 사용 (git reset, git restore 등)
  must  40pt  필수 옵션·인수 (--soft, --staged, <hash> 등)
  bonus 20pt  권장 형식 (정확한 브랜치명, 안전한 플래그 등)

  perfect  = 100pt (base+must+bonus 모두)
  accepted = 80pt  (base+must, bonus 없음) — 실용적으로 맞지만 최선은 아닌 형태
  partial  = base>0 또는 must>0 but <80pt
  forbidden = 금지 명령어 (--force, --amend 등) 사용
  wrong    = git으로 시작하지 않거나 완전히 다른 명령
  lower-retry = 재시도 점수가 bestScore보다 낮음 (점수 반영 안 됨)
```

공통 유틸: `graders.ts` — `checkForbidden`, `makeWrong`, `makeForbidden`, `makeScore`.
카드별 `grade` 함수는 `constants/card-*.ts`에서 직접 구현하고 이 유틸을 조합한다.

### 6. VizState & flyTransition 애니메이션

`VizState`는 git 상태 스냅샷이다.

```ts
VizState {
  working: FileItem[]   워킹 디렉터리 파일들
  staging: FileItem[]   스테이지 파일들
  commits: CommitItem[] 커밋 이력 (branch, current 포함)
}

CommitItem.branch 예: "HEAD → main", "HEAD → main · recovery"
```

정답(perfect/accepted)이고 `flyTransition`이 있을 때만 애니메이션 실행:

1. `useIncidentScore` → `card:graded` emit
2. `useIncidentVisualization` → `setFlying(...)` 으로 날아가는 파일 표시 (Visualization 담당)
3. `delayMs` 후 `setFlying(null)` + `tx.apply(prev, { input })` 로 VizState 변경

**재시도 시 viz 복원**: `phase:idle` 이벤트 구독 → pending setTimeout 취소 + `initialViz`
복원. unmount 시에도 cleanup에서 clearTimeout 호출.

### 7. CatPanel — 고양이 & 멘토 영역

```
CatPanel
  ├─ 상단: [도감] [⏸] 버튼 (TopBar에서 이동)
  ├─ 멘토 섹션 (오답 coaching 또는 답안/해설보기 시 등장)
  │    coaching 우선, coaching 없으면 explanation(카드 해설), 둘 다 없으면 기본 문구
  │    canonical 명령어 블록 표시
  ├─ 고양이 스프라이트 + 말풍선
  │    힌트 표시 중: hintText / 평상시: moodText(카드별 커스텀)
  └─ 힌트 토글 버튼
```

**catMood 결정 규칙**:
```
confirming          → 'confirming'
scored + perfect/accepted → 'perfect'
scored + forbidden  → 'forbidden'
scored + else       → 'partial'
else                → 'idle'
```

### 8. 시나리오 전환·다시하기: key remount 패턴

`IncidentPage`에서 `key={`${currentId}:${retryCount}`}`를 `IncidentGame`에 부여한다.

- **다음 임무**: `navigate(scenarioId: nextId)` → `currentId` 변경 → `key` 변경 → React remount
- **다시하기**: `setRetryCount((n) => n + 1)` → `key` 변경 → React remount
  - (동일 URL navigate는 TanStack Router가 no-op 처리하므로 navigate 대신 state 증가)

remount 시 `useIncidentGame`의 mount `useEffect([], [])` 재실행 → 9개 Jotai atom 전부 reset.

### 9. 클리어 기록 영구 보존 (incidentProgressStore)

```
Zustand + persist(localStorage)
key: `incident-progress:{memberId}` (로그인 유저별 분리)
    `incident-progress:guest` (미로그인)
```

`main.tsx`에서 앱 기동 시 legacy key(`incident-progress`) → userId 키로 1회 마이그레이션.
remount/unmount에 무관하게 보존된다.

### 10. 브랜치 프롬프트 동적 표시

`InputRow`의 `(main) $` 프롬프트는 `viz.commits`에서 `current: true`인 커밋의
`branch` 필드를 파싱해 동적으로 반영한다.

```ts
const raw = viz.commits.find(c => c.current)?.branch ?? '';
// "HEAD → main · recovery" → 'main'
const currentBranch = raw.match(/HEAD\s*→\s*([^\s·]+)/)?.[1] ?? 'main';
```

---

## Why

- **stateRef 병행 유지**: Jotai atom 업데이트는 배치/비동기라 채점 콜백 클로저 안에서
  stale 읽기가 발생한다. `stateRef`는 항상 최신 동기값을 보장한다.
- **incidentBus**: `useIncidentScore`가 viz를 직접 조작하면 두 훅이 결합된다. 버스를
  경유하면 단방향 흐름을 유지하고 각 훅을 독립 테스트할 수 있다.
- **key remount**: `useEffect` 의존성에 `scenarioId`를 추가하는 방식은 `IncidentGame`
  내 7개 useState를 수동으로 reset해야 해서 누락 위험이 크다. key 1줄이 전체 트리를
  초기화한다.
- **hint에 정답 노출 금지**: 힌트가 정답이면 플레이어가 직접 생각할 기회가 없어진다.
  방향 유도형("어떤 옵션이 X를 하나요?")으로 작성해야 한다.
- **base/must/bonus 3계층**: 명령어만 맞아도 점수가 생기고, 필수 옵션까지 더하면
  실용 점수, 권장 형식까지 갖추면 만점이 된다. 0 아니면 100 방식보다 부분 점수가
  학습 동기를 유지시킨다.

---

## Caution

- **stateRef ↔ atom 이중 관리**: atom을 set할 때 반드시 `stateRef.current`도 함께
  업데이트해야 stale 읽기 버그가 생기지 않는다. 새 훅을 추가할 때 이 패턴을 빠뜨리지 말 것.
- **flyTransition pending 취소**: `useIncidentVisualization`의 setTimeout cleanup은
  `phase:idle`(재시도)과 `card:next`(다음 카드), 그리고 `useEffect` cleanup(unmount) 세 곳
  모두에서 `clearTimeout`이 필요하다. 하나라도 빠지면 stale viz가 덮어쓰인다.
- **card grade 함수 side-effect 금지**: `grade`는 순수 함수여야 한다. 내부에서 atom이나
  외부 상태를 변경하면 채점 시점과 관계없이 부작용이 생긴다.
- **canonical/hint 정답 분리**: `canonical`은 채점 후 "답안/해설보기"에서만 노출된다.
  `hint`는 채점 전에도 볼 수 있으므로 정답 명령어를 그대로 쓰면 안 된다.
- **시나리오 ID 매핑**: `IncidentPage`의 `NEXT_SCENARIO_ID`와 `ScenarioSelectModal`의
  잠금 정책(`isLocked`)은 시나리오 추가 시 함께 업데이트해야 한다.
- **incidentProgressStore legacy 마이그레이션**: `main.tsx`의 1회 마이그레이션 코드는
  `incident-progress` 키가 없어질 때(충분한 시간이 지난 후) 제거 가능.

---

## 파일 구조

```
features/incident/
  bridge/
    incidentBus.ts          도메인 이벤트 버스 (TypedEventBus 래핑)
  components/
    IncidentPage.tsx         라우트 어댑터 (key/retryCount 관리)
    IncidentGame.tsx         게임 오케스트레이터
    TopBar.tsx               상단 바 (시나리오 제목·진행도)
    NarrativeStrip.tsx       카드 상황 설명 띠
    InputRow.tsx             터미널 입력 + 채점 결과 + 버튼
    CatPanel.tsx             고양이·멘토·힌트 사이드바
    Visualization.tsx        git 상태 시각화
    CommitPane.tsx / Pane.tsx / Arrow.tsx / FileRow.tsx  시각화 서브 컴포넌트
    IncidentCatSprite.tsx / MentorCharacter.tsx          캐릭터 스프라이트
    CardMissionModal.tsx     카드 진입 시 미션 설명 모달
    ScenarioIntroModal.tsx   시나리오 시작 인트로 모달
    ScenarioResultModal.tsx  시나리오 완료 결과 모달
    ScoreRow.tsx             채점 점수 행
  constants/
    scenarios.ts             시나리오 배열 + findScenario()
    card-1-1.ts … card-4-5.ts  카드 데이터 (grade 함수 포함)
  hooks/
    useIncidentGame.ts       오케스트레이터 훅 (stateRef 생성 + 하위 훅 조합)
    useIncidentInput.ts      입력 상태 관리
    useIncidentPhase.ts      phase 상태머신 (idle ↔ confirming)
    useIncidentScore.ts      채점 + history + bestScore
    useIncidentNavigation.ts 카드 인덱스 전진 + 시나리오 완료
    useIncidentVisualization.ts viz + flying 애니메이션
    useStageScale.ts         컨테이너 스케일 계산
  store/
    incidentInputAtom.ts
    incidentPhaseAtom.ts
    incidentNavAtom.ts       (cardIndex)
    incidentScoreAtom.ts     (scored, bestScore, history)
    incidentHintAtom.ts
    incidentVizAtom.ts       (viz, flying)
    incidentProgressStore.ts Zustand persist (클리어 기록)
  types/
    incident.types.ts        Card, Scenario, VizState, ScoreResult 등
  utils/
    graders.ts               checkForbidden, makeWrong, makeScore 등
```

---

## Test Plan

```bash
cd FE
npx tsc --noEmit
npx eslint src/features/incident/
```

브라우저 수동 확인:

**기본 게임 플로우**
1. 홈 → 고양이 사고처리반 → 시나리오 1 선택 → `/incident?scenarioId=1`
2. 인트로 모달 → "시작하기" → 카드 1-1 미션 모달 → 닫기
3. 터미널에 정답 입력 → ⏎ 채점 → 점수·coaching 표시 → viz 애니메이션
4. "다음▶" → 카드 2로 이동 (viz 초기화 확인)
5. 마지막 카드 "완료!" → 결과 모달 (총점·별점·카드별 점수)

**재시도**
6. 채점 후 "← 재시도" → viz가 카드 initialViz로 복원되는지 확인
7. 같은 명령 재입력 → 애니메이션이 한 번만 실행되는지 확인
8. 결과 모달 "↺ 다시하기" → 인트로부터 재시작 (이전 history·viz 없음)

**다음 임무**
9. 시나리오 1 완료 → "▶ 다음 임무 시작하기" → 시나리오 4 인트로 모달 표시
10. 시나리오 4 완료 → "다음 임무" 버튼 없음

**일시정지·도감**
11. CatPanel 상단 ⏸ 클릭 → PauseModal (BGM 설정 포함)
12. ESC 키 → PauseModal
13. 도감 버튼 → DictionaryModal

**채점 엣지케이스**
14. forbidden 명령어 입력 (예: `git reset --hard`) → 빨간 테두리 + 고양이 "히익!" 반응
15. 점수가 bestScore보다 낮은 재시도 → `lower-retry` status, 점수 미반영
16. "답안/해설보기" → mentor balloon에 explanation 텍스트 표시
17. 힌트 보기 → 정답 명령어가 직접 노출되지 않는지 확인

**진행 기록**
18. 시나리오 1 완료 → 새로고침 → 홈 ScenarioSelectModal에서 시나리오 1 클리어 표시
19. 다른 유저로 로그인 → 진행 기록 분리 확인
