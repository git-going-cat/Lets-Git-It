# Single_IMPLEMENTATION_싱글게임인게임상태관리

## Background / Context

싱글 모드 게임 페이지의 레이아웃 구조와 인게임 상태 atom·세션 store를 설계하는 작업 (S14P31A304-126·127 일부).  
- 126번: 3분할 레이아웃, HUD 컴포넌트 껍데기, 기초 atom, Phaser Scene 껍데기 확정  
- 127번: 추가 atom, singleStore, PauseModal/ResultModal, 공통 픽셀 UI, 점수 계산 로직 확정  
게임 로직 구현(128번)을 위해 상태 계층이 먼저 완성돼야 병렬 작업이 가능하다.

---

## Decision

### 1. 3분할 레이아웃

고정 px 대신 Tailwind 비율 클래스(`w-1/5`, `w-3/5`, `w-1/5`)를 사용했다.  
최소 지원 해상도(1280×720) 이상에서 자연스럽게 늘어나도록 하기 위함.

### 2. 기초 Jotai atom

`features/single/store/`에 atom마다 파일을 분리했다.

- `livesAtom.ts` — 목숨 (초기값 3), `MAX_LIVES` 상수 함께 export
- `comboAtom.ts` — 콤보 카운터 (초기값 0)
- `churuAtom.ts` — 츄르 스틱 개수 (`churuCountAtom`, 초기값 0)
- `itemSlotsAtom.ts` — 아이템 슬롯 활성화 여부 (초기값 `[false, false, false]`)

### 3. 추가 Jotai atom

기초 atom(lives, combo, itemSlots, churu)에 더해 아래 6개를 추가했다.

- `scoreAtom.ts` — 점수 (초기값 0)
- `timerAtom.ts` — 경과 시간 ms 단위 (`elapsedTimeAtom`, 초기값 0)
- `typoAtom.ts` — 오타 횟수 + 총 입력 시도 횟수 (`typoCountAtom`, `totalAttemptsAtom`)
- `gameStatusAtom.ts` — 게임 상태 머신 (`GameStatus`, 초기값 `'idle'`)
- `commandIndexAtom.ts` — 현재 진행 중인 명령어 인덱스 (`currentCommandIndexAtom`, 초기값 0)
- `gameResultAtom.ts` — 게임 종료 결과 (`GameResult | null`, 초기값 `null`)
- `activeBranchAtom.ts` — 유저의 현재 브랜치 위치 (`atom<string>('main')`, 초기값 `'main'`)

> **activeBranch 상세**: `IMPLEMENTATION_레인렌더링및브랜치입력판정.md` — "4. activeBranchAtom" 참고

#### GameResult 인터페이스

```ts
export interface GameResult {
  status: 'SUCCESS' | 'GAMEOVER';
  score: number;
  grade: Grade;
  playTimeMs: number;
  missCount: number;   // game:over / game:complete 수신 시 stateRef.livesLost 기록
  typoCount: number;   // game:over / game:complete 수신 시 typoRef.current 기록
}
```

### 4. HUD 컴포넌트 분리

`SingleHUD`는 조립만 담당하고, 각 관심사를 별도 컴포넌트로 분리했다.

```
SingleHUD        ← 조립만
├── HUDLives     ← 하트 표시, livesAtom 구독
├── HUDCombo     ← 콤보 숫자, comboAtom 구독 + 팝 애니메이션
└── HUDItemSlots ← 아이템 슬롯 3개, itemSlotsAtom 구독
```

**HUDCombo 팝 애니메이션**: `key={combo}`로 콤보 변경 시마다 span을 remount해 CSS 애니메이션을 재트리거한다.

```css
@keyframes combo-pop {
  0%   { transform: scale(1.7); filter: brightness(1.8); }
  100% { transform: scale(1);   filter: brightness(1); }
}
```

- 지속시간: 0.25s ease-out
- `combo > 0`일 때만 애니메이션 적용 (콤보 리셋 시 무반응)

### 5. singleStore (Zustand)

서버 세션 응답 데이터를 Zustand로 관리한다.

- 저장 항목: `sessionId`, `difficulty`, `bestScore`, `commandSet`
- 액션: `setSession` (게임 시작 시 API 응답 저장), `clearSession` (게임 종료 시 초기화)
- `create<T>((set) => ...)` 단일 호출 형태 사용 — 타입 파라미터를 명시적으로 전달하므로 v5에서도 추론이 정확하게 동작한다

`setSession`은 API 응답의 `commandSet`을 `assignItemDrops(difficulty)`로 가공해 저장한다. 이로써 낙하 전부터 아이템 노드가 시각적으로 구분된다. 튜토리얼 모드이거나 difficulty가 null이면 `assignItemDrops`를 건너뛴다.

> **사전 드롭 배정 상세**: `IMPLEMENTATION_게임피드백애니메이션.md` — "1. 사전 드롭 배정" 참고

### 6. 타입 분리

`GameStatus`, `Difficulty`, `CommandType`, `Command`, `ItemType`, `ITEM_SLOT_MAP` 타입을 `features/single/types/single.types.ts`에 집중했다.

- `ItemType = 'restore' | 'stash' | 'cherry-pick'`
- `ITEM_SLOT_MAP = ['stash', 'cherry-pick', 'restore']` — 슬롯 인덱스(0·1·2)와 아이템 종류의 고정 매핑
- `Command.itemDrop?: ItemType` — 세션 시작 시 사전 배정된 드롭 종류. 없으면 일반 노드
- `DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const` + `Difficulty = (typeof DIFFICULTIES)[number]` — enum 대신 `as const` 배열을 사용한다. JavaScript에서 enum을 피하고 `z.enum(DIFFICULTIES)`처럼 Zod와 직접 조합할 수 있어 스키마와 타입이 단일 소스에서 파생된다.

> **아이템 상세**: `IMPLEMENTATION_아이템드롭및사용.md` 참고  
store 파일 내부에는 Zustand 구현 전용 인터페이스(`SingleSessionState`, `SingleSessionActions`)만 남겼다.  
`Grade` 타입은 멀티 모드에서도 사용 가능성이 있어 `shared/types/game.types.ts`에 배치했다.

### 7. PauseModal / ResultModal

`gameStatusAtom`을 구독해 표시 여부를 결정한다.

- `PauseModal`: `'paused'` 상태일 때 표시. BGM/SFX 인라인 설정 섹션(`SettingsSection`) + 이어하기 / 다시하기 / 나가기 버튼 제공
- `ResultModal`: `'gameover'` 또는 `'cleared'` 상태일 때 표시.
  - 성공/실패 배지, 점수, 등급, 플레이 시간, 난이도, **MISS 횟수, TYPO 횟수** 표시
  - 본인 최고 기록 갱신 시 NEW! 뱃지 표시
  - GAMEOVER일 때 점수는 0점으로 고정

이벤트 처리 로직은 각각 `usePauseModal`, `useResultModal` Hook으로 분리했다.

### 8. churuCountAtom 연동 (`useSingleGame`)

`churuCountAtom`은 정의만 돼 있던 상태에서 실제 게임 이벤트와 연결됐다.

- `handleComplete` 내에서 SWITCH 타입 제외 후 `setChuru(prev => prev + 1)` 호출
- `resetGame()`에서 `setChuru(0)` 초기화

```ts
const completedCmd = useSingleStore.getState().commandSet[index];
if (completedCmd && completedCmd.type !== 'SWITCH') {
  setChuru((prev) => prev + 1);
}
```

### 9. 공통 픽셀 UI 컴포넌트 (shared)

픽셀 아트 스타일 UI를 NES.css 기반으로 구현해 `shared/`에 배치했다.

- `shared/components/PixelButton.tsx` — `nes-btn` 기반 버튼, variant(primary/secondary/danger) 지원
- `shared/components/PixelModal.tsx` — `nes-container is-dark` 기반 모달 래퍼, `useModal` 연결
- `shared/hooks/useModal.ts` — ESC 닫기 + 배경 스크롤 잠금 공통 동작

NES.css는 전역 오염 방지를 위해 CSS `layer(nes)`로 격리해 import했다.

```css
@import "tailwindcss";
@import 'nes.css/css/nes.min.css' layer(nes);
```

### 10. 점수 계산 로직 (scoreCalculator)

만점 10,000점에서 감점하는 방식으로 확정했다.

```
score = max(0, 10000 - 시간감점 - 오타감점 - 목숨감점)
```

- 위치: `features/single/utils/scoreCalculator.ts`
- 플레이 중 점수를 표시하지 않으므로 게임 종료 시점에 한 번만 호출
- 목숨 회복 아이템과 무관하게 `livesLost`는 누적 카운팅

**감점 파라미터 (SCORE_CONFIG)**:

| 난이도 | idealTimeSec | timePenaltyPer100ms | typoPenalty(개당) | livesPenalty(개당) |
|--------|-------------|---------------------|-------------------|--------------------|
| EASY   | 75          | 6 (1초당 60점)      | 220               | 800                |
| NORMAL | 110         | 6 (1초당 60점)      | 400               | 1200               |
| HARD   | 150         | 6 (1초당 60점)      | 700               | 1700               |

시간 감점은 `Math.floor(overMs / 100) * timePenaltyPer100ms`로 100ms 단위 floor 처리되어 동점자 회피와 정밀한 차등을 보장한다.

### 11. singleApi + Zod 스키마 구현

`features/single/api/singleApi.ts`와 `features/single/schemas/single.schema.ts`를 구현했다.

- `startSession(difficulty)` — `POST /api/v1/single/sessions` 호출 후 `startSessionDataSchema`로 응답 검증
- `saveResult(sessionId, body)` — `POST /api/v1/single/sessions/:id/result` 호출 후 `saveResultDataSchema`로 응답 검증
- `StartSessionData` 타입은 `z.infer<typeof startSessionDataSchema>`에서 파생해 스키마와 타입이 단일 소스를 갖는다

`SinglePage`는 마운트 시 `singleApi.startSession(difficulty)`를 호출해 세션 데이터를 `singleStore.setSession()`에 저장한다. 언마운트 시 `clearSession()`으로 초기화한다. Phaser가 Zustand를 직접 읽어야 하므로 TanStack Query 대신 useEffect 직접 호출 방식을 쓴다 (컨벤션 예외 항목으로 `FE_CONVENTION.md` 등록됨).

### 12. 라우트 가드 + difficulty 연결

`routes/single.tsx`에 `validateSearch` + `beforeLoad`를 추가했다.

- `validateSearch`: Zod로 `difficulty: z.enum(DIFFICULTIES).optional()` 검증
- `beforeLoad`: `search.difficulty`가 없으면 즉시 `/home`으로 redirect
- `SinglePage`는 `useSearch({ from: '/single' })`로 difficulty를 읽어 `startSession` 호출에 전달

### 13. 전역 BGM 오디오 스토어 + 인게임 설정 연동

`shared/store/audioStore.ts` (Zustand + persist)와 `shared/hooks/useBgm.ts`를 신규 생성했다.

- `audioStore`: `bgmEnabled`, `bgmVolume`(기본 10%), `sfxEnabled`(비활성), `sfxVolume` 저장. localStorage `'audio-settings'` 키로 persist.
- `useBgm`: 모듈 레벨 싱글톤 `_audio`로 Audio 인스턴스를 관리해 React Strict Mode 이중 마운트 시 두 개 생성을 방지. `__root.tsx`의 `RootComponent`에서 호출해 앱 전체 생명주기에 걸쳐 BGM이 유지된다.
- `PauseModal` 인게임 설정이 `audioStore`에 연결됨으로써 홈 설정 모달과 상태를 공유한다. SFX 섹션은 미구현으로 `opacity-40` + `disabled` 처리.

### 11. SingleScene 껍데기

`create()` / `shutdown()`에 EventBus 등록·해제 위치만 표시했다.  
React import 없이 EventBus 경유만 허용하는 구조.

---

## Why

### atom 파일 분리 이유

Jotai는 atom이 독립적으로 구독되는 구조라, 파일이 분리돼 있어야 트리 쉐이킹이 유효하고 나중에 atom이 복잡해질 때 (파생 atom, 비동기 처리) 파일 내에서 자연스럽게 확장 가능하다.

### HUDLives에서 `MAX_LIVES` 상수 분리 이유

`Array.from({ length: 3 })`과 `atom(3)` 두 곳에 매직 넘버가 중복돼 있었다.  
최대 목숨 수 변경 시 한 곳만 수정하도록 `livesAtom.ts`에서 `MAX_LIVES = 3`으로 관리한다.

### HUDCombo에서 key={combo} remount 전략을 쓴 이유

CSS animation은 요소가 DOM에 처음 마운트될 때 자동 재생된다.  
`key` 변경으로 remount를 트리거하면 animation 클래스를 제거·재추가하는 별도 로직 없이  
매 콤보 변경 시 애니메이션을 자연스럽게 재실행할 수 있다.

### typoCountAtom과 totalAttemptsAtom을 같은 파일에 둔 이유

둘 다 오타율(`typoCount / totalAttempts`) 계산이라는 하나의 관심사이고, 항상 같이 초기화·업데이트된다.  
파일을 분리하면 두 atom이 서로를 모르는 구조가 되어 관계가 코드에서 사라진다.

### GameStatus 타입을 store가 아닌 types에 둔 이유

`PauseModal`, `ResultModal`, `SingleScene`(EventBus emit 타입)이 모두 이 타입을 참조한다.  
store에 두면 타입 하나를 위해 store 전체를 import해야 하는 의존 방향이 생긴다.

### 세션 데이터를 TanStack Query 대신 Zustand에 둔 이유

컨벤션은 "서버 상태는 TanStack Query가 단독 관리"이나, 싱글 세션 데이터는 성격이 다르다.
- 세션은 한 번 받고 재조회하지 않는 초기화 데이터다.
- `commandSet`을 Phaser Scene이 EventBus를 통해 접근해야 해서 Query 캐시에서 꺼내 쓰기 어렵다.
- 프로젝트 전체에서 이 패턴을 쓰는 모드가 싱글뿐이라 예외 케이스를 추가할 만큼의 이유가 없다.

### Zustand v5에서 `create<T>(fn)` 단일 호출을 쓴 이유

`create<T>((set) => ...)` 형태로 타입 파라미터를 명시적으로 전달하면 TypeScript 추론이 깨지지 않는다.  
curried 형태(`create<T>()((set) => ...)`)는 타입 추론이 필요한 미들웨어 체인(immer 등) 상황에서 더 안전하지만, singleStore는 미들웨어 없이 단순 set만 사용하므로 단일 호출로도 충분하다.

### gameResultAtom에 missCount·typoCount를 추가한 이유

ResultModal에서 MISS / TYPO 수치를 표시해야 한다.  
EventBus는 Phaser → React 단방향이므로 React 측에서 수신해 atom에 저장한다.  
`missCount`는 `useSingleGame`의 `stateRef.livesLost`(목숨 차감 누적), `typoCount`는 `typoRef.current`(클로저 stale 방지용 ref)에서 읽는다.

### 점수를 플레이 중에 표시하지 않은 이유

감점 방식은 실시간으로 점수가 줄어드는 형태라 심리적 불쾌감이 있고, HUD에 점수를 표시할 공간도 없다.  
콤보/목숨/아이템으로 플레이 중 피드백을 충분히 제공하므로 점수는 결과 화면에서만 보여준다.

### NES.css를 layer(nes)로 격리한 이유

NES.css는 `body { font-family: 'Press Start 2P' }` 같은 전역 스타일을 포함한다.  
`@import ... layer(nes)`로 낮은 우선순위 레이어에 격리하면 Tailwind 및 다른 스타일이 항상 우선해 게임 외 페이지에 영향을 주지 않는다.

### PixelButton / PixelModal을 shared에 배치한 이유

멀티 모드(타임어택, 협력, 기여도 뺏기)에서도 결과 모달이 필요하다.  
NES.css 기반 픽셀 UI는 게임 전반의 공통 디자인 언어로 쓰이므로 `features/single/`에 두면 재사용이 불가능하다.

### 목숨 회복 아이템이 있어도 livesLost를 누적하는 이유

일반적인 게임에서 점수는 "얼마나 많이 실패했느냐" 기준으로 산정한다.  
회복 아이템의 가치는 "게임오버 방지"에 있고, 감점을 되돌려주면 아이템이 사실상 점수 회복 아이템이 되어 밸런스가 무너진다.

### 컴포넌트 내부 스타일 고정 이유

`SingleHUD`는 싱글 게임 페이지에서만 쓰이는 컴포넌트라 재사용 가능성이 없다.  
`className` prop으로 외부 주입을 허용하면 책임이 분산되므로, 내부에서 스타일을 고정하고 레이아웃 크기는 `pages/single/index.tsx`에서 래퍼 div로 결정한다.

---

## Caution

- `GameStatus`의 값이 소문자(`'idle'`, `'playing'`)인 반면 `Difficulty`는 대문자(`'EASY'`, `'NORMAL'`)다. BE API 연동 값과 프론트 전용 값의 대소문자 기준이 컨벤션에 미확정 상태다. `FE_CONVENTION.md` 업데이트 필요.
- `elapsedTimeAtom`은 ms 단위다. 점수 계산 공식 사용 시 단위 변환 주의.
- `churuCountAtom`은 SWITCH 타입 명령어를 제외하고 증가한다. `ChuruStack`의 `totalCommands` 계산도 동일하게 SWITCH를 제외해야 step이 정확히 맞는다. → `IMPLEMENTATION_비주얼컴포넌트및UX개선.md` 참고
- `saveResult` API는 `singleApi.ts`에 구현돼 있으나, 게임 종료 시 실제 호출하는 로직이 아직 연결되지 않았다. `ResultModal` 또는 `useSingleGame`에서 `game:complete`/`game:over` 수신 시 호출해야 한다.
- SFX(효과음)는 미구현 상태로 `audioStore`에 `sfxEnabled: false`로 저장되고 UI는 비활성화 처리됐다. 효과음 에셋 준비 후 `useSfx` 훅을 추가해야 한다.

---

## Test Plan

- `useSingleStore.setSession(mockSession)` 호출 후 `commandSet`, `sessionId`, `bestScore` 정상 저장 확인 → **vitest 자동화 완료**
- `useSingleStore.clearSession()` 호출 후 전체 필드 초기값 복귀 확인 → **vitest 자동화 완료**
- `gameStatusAtom` 값 `'paused'` → `PauseModal` 렌더링 확인 → **시각 확인 완료**
- `gameStatusAtom` 값 `'cleared'` + `gameResultAtom` 값 존재 → `ResultModal` 렌더링 확인 → **시각 확인 완료**
- ResultModal에 GRADE / TIME / DIFFICULTY / MISS / TYPO 5개 항목 모두 표시 확인 → **시각 확인 완료**
- NEW! 뱃지: `score > bestScore` 조건 충족 시 표시 확인 → **시각 확인 완료**
- 콤보 증가 시 HUDCombo 숫자 팝 애니메이션 확인 → **시각 확인 완료**
- 콤보 리셋(0) 시 팝 애니메이션 없음 확인 → **시각 확인 완료**
- `typoCountAtom` 증가 시 `totalAttemptsAtom`도 함께 증가하는지 로직 연동 확인 → **시각 확인 완료**
- `livesAtom` 초기값 3 → `HUDLives`에서 하트 3개 모두 채워진 상태로 렌더링 확인 → **시각 확인 완료**
- 1280×720 해상도에서 3분할 레이아웃 깨짐 없는지 확인
