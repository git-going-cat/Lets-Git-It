# Single_IMPLEMENTATION_싱글게임인게임상태관리

## Background / Context

싱글 모드 게임 진행에 필요한 인게임 상태 atom과 세션 store를 설계하는 작업 (S14P31A304-127 일부).  
126번 작업에서 HUD 컴포넌트 껍데기까지 완성됐으나, 실제로 구독할 atom이 없어 127번 이후 게임 로직 구현이 불가능한 상태였다.  
또한 게임 시작 시 서버에서 받아오는 세션 데이터(sessionId, commandSet 등)를 어디서 어떻게 관리할지 확정이 필요했다.  
추가로 PauseModal / ResultModal 구현, 공통 픽셀 UI 컴포넌트 설계, 점수 계산 로직 분리가 이 작업에서 함께 확정됐다.

---

## Decision

### 1. Jotai atom 추가 분리

기존 atom(lives, combo, itemSlots, churu)에 더해 아래 5개를 추가했다.

- `scoreAtom.ts` — 점수 (초기값 0)
- `timerAtom.ts` — 경과 시간 ms 단위 (`elapsedTimeAtom`, 초기값 0)
- `typoAtom.ts` — 오타 횟수 + 총 입력 시도 횟수 (`typoCountAtom`, `totalAttemptsAtom`)
- `gameStatusAtom.ts` — 게임 상태 머신 (`GameStatus`, 초기값 `'idle'`)
- `commandIndexAtom.ts` — 현재 진행 중인 명령어 인덱스 (`currentCommandIndexAtom`, 초기값 0)
- `gameResultAtom.ts` — 게임 종료 결과 (`GameResult | null`, 초기값 `null`) ← 신규 추가

### 2. singleStore (Zustand)

서버 세션 응답 데이터를 Zustand로 관리한다.

- 저장 항목: `sessionId`, `difficulty`, `bestScore`, `commandSet`
- 액션: `setSession` (게임 시작 시 API 응답 저장), `clearSession` (게임 종료 시 초기화)
- Zustand v5 curried 문법 `create()()` 사용

### 3. 타입 분리

`GameStatus`, `Difficulty`, `CommandType`, `Command` 타입을 `features/single/types/single.types.ts`에 집중했다.  
store 파일 내부에는 Zustand 구현 전용 인터페이스(`SingleSessionState`, `SingleSessionActions`)만 남겼다.  
`Grade` 타입은 멀티 모드에서도 사용 가능성이 있어 `shared/types/game.types.ts`에 배치했다.

### 4. PauseModal / ResultModal

`gameStatusAtom`을 구독해 표시 여부를 결정한다.

- `PauseModal`: `'paused'` 상태일 때 표시. 이어하기 / 다시하기 / 설정 / 나가기 버튼 제공
- `ResultModal`: `'gameover'` 또는 `'cleared'` 상태일 때 표시. 성공/실패 배지, 점수, 등급, 플레이 시간, 난이도 표시. 본인 최고 기록 갱신 시 NEW! 뱃지 표시

이벤트 처리 로직은 각각 `usePauseModal`, `useResultModal` Hook으로 분리했다.

### 5. 공통 픽셀 UI 컴포넌트 (shared)

픽셀 아트 스타일 UI를 NES.css 기반으로 구현해 `shared/`에 배치했다.

- `shared/components/PixelButton.tsx` — `nes-btn` 기반 버튼, variant(primary/secondary/danger) 지원
- `shared/components/PixelModal.tsx` — `nes-container is-dark` 기반 모달 래퍼, `useModal` 연결
- `shared/hooks/useModal.ts` — ESC 닫기 + 배경 스크롤 잠금 공통 동작

NES.css는 전역 오염 방지를 위해 CSS `layer(nes)`로 격리해 import했다.

```css
@import "tailwindcss";
@import 'nes.css/css/nes.min.css' layer(nes);
```

### 6. 점수 계산 로직 (scoreCalculator)

만점 10,000점에서 감점하는 방식으로 확정했다.

```
score = max(0, 10000 - 시간감점 - 오타감점 - 목숨감점)
```

- 위치: `features/single/utils/scoreCalculator.ts`
- 플레이 중 점수를 표시하지 않으므로 게임 종료 시점에 한 번만 호출
- 목숨 회복 아이템과 무관하게 `livesLost`는 누적 카운팅

---

## Why

### atom에 주석을 달지 않은 이유

컨벤션이 "Hook/Util/Phaser Scene에만 JSDoc 필수, 명백한 코드에는 주석 금지"다.  
atom은 세 범주 어디에도 해당하지 않고 이름으로 용도가 명확하다.

### typoCountAtom과 totalAttemptsAtom을 같은 파일에 둔 이유

둘 다 오타율(`typoCount / totalAttempts`) 계산이라는 하나의 관심사이고, 항상 같이 초기화·업데이트된다.  
파일을 분리하면 두 atom이 서로를 모르는 구조가 되어 관계가 코드에서 사라진다.

### GameStatus 타입을 store가 아닌 types에 둔 이유

`PauseModal`, `ResultModal`, 이후 구현할 `SingleScene`(EventBus emit 타입)이 모두 이 타입을 참조한다.  
store에 두면 타입 하나를 위해 store 전체를 import해야 하는 의존 방향이 생긴다.

### 세션 데이터를 TanStack Query 대신 Zustand에 둔 이유

컨벤션은 "서버 상태는 TanStack Query가 단독 관리"이나, 싱글 세션 데이터는 성격이 다르다.
- 세션은 한 번 받고 재조회하지 않는 초기화 데이터다.
- `commandSet`을 Phaser Scene이 EventBus를 통해 접근해야 해서 Query 캐시에서 꺼내 쓰기 어렵다.
- 프로젝트 전체에서 이 패턴을 쓰는 모드가 싱글뿐이라 예외 케이스를 추가할 만큼의 이유가 없다.

### Zustand v5 curried 문법을 쓴 이유

프로젝트가 `zustand@5.0.12`를 사용한다. v4의 `create()` 단일 호출 형태는 v5에서 TypeScript 타입 추론이 깨진다.  
`create()()` curried 형태가 v5 공식 TypeScript 권장 문법이다.

### gameResultAtom을 별도 파일로 추가한 이유

`game:over` EventBus 이벤트 페이로드(`status`, `score`, `grade`, `playTimeMs`)를 ResultModal이 읽어야 한다.  
EventBus는 Phaser → React 단방향이므로 React 측에서 수신해 atom에 저장하는 중간 계층이 필요했다.

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

---

## Caution

- `Command`, `Difficulty`, `CommandType` 타입은 현재 `single.types.ts`에 직접 정의돼 있으나, API 응답 검증을 위해 `features/single/api/singleApi.ts`에 Zod 스키마 작성 후 `z.infer`로 교체해야 한다.
- `GameStatus`의 값이 소문자(`'idle'`, `'playing'`)인 반면 `Difficulty`는 대문자(`'EASY'`, `'NORMAL'`)다. BE API 연동 값과 프론트 전용 값의 대소문자 기준이 컨벤션에 미확정 상태다. `FE_CONVENTION.md` 업데이트 필요.
- `elapsedTimeAtom`은 ms 단위다. 점수 계산 공식 사용 시 단위 변환 주의.
- `game:over` EventBus 이벤트를 React에서 수신해 `gameResultAtom`과 `gameStatusAtom`을 업데이트하는 구독 로직이 아직 없다. SinglePage 컴포넌트 구현 시 `useEffect`로 연결해야 한다.
- `PauseModal`의 설정 버튼(`onSettings`)은 TODO 상태다. 팀원 설정 모달 구현 완료 후 연결 필요.
- `scoreCalculator.ts`의 `SCORE_CONFIG` 수치(idealTimeSec, timeRate 등)는 플레이테스트 전 임시값이다. 실제 플레이 데이터 수집 후 조정 필요.
- `typoCountAtom` 증가 시 `totalAttemptsAtom`도 함께 증가하는지 연동 확인은 127번 게임 로직 구현 시 검증한다.

---

## Test Plan

- `useSingleStore.setSession(mockSession)` 호출 후 `commandSet`, `sessionId`, `bestScore` 정상 저장 확인 → **vitest 자동화 완료**
- `useSingleStore.clearSession()` 호출 후 전체 필드 초기값 복귀 확인 → **vitest 자동화 완료**
- `gameStatusAtom` 값 `'paused'` → `PauseModal` 렌더링 확인 → **시각 확인 완료**
- `gameStatusAtom` 값 `'cleared'` + `gameResultAtom` 값 존재 → `ResultModal` 렌더링 확인 → **시각 확인 완료**
- NEW! 뱃지: `score > bestScore` 조건 충족 시 표시 확인 → **시각 확인 완료**
- `typoCountAtom` 증가 시 `totalAttemptsAtom`도 함께 증가하는지 로직 연동 확인 → **127번 게임 로직 구현 시 예정**
