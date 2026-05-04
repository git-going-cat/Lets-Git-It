# Single_IMPLEMENTATION_싱글모드게임페이지레이아웃

## Background / Context

싱글 모드 게임 페이지의 레이아웃 구조를 잡는 작업 (S14P31A304-126).  
동작 로직 구현 전에 3분할 레이아웃, HUD 컴포넌트, 인게임 상태 atom, Phaser Scene 껍데기를 먼저 확정해야 127번 이후 작업이 병렬로 진행 가능하다.

---

## Decision

### 1. Jotai atom 파일 분리

atom마다 파일을 분리했다 (`features/single/store/`).

- `livesAtom.ts` — 목숨 (초기값 3), `MAX_LIVES` 상수 함께 export
- `comboAtom.ts` — 콤보 카운터 (초기값 0)
- `churuCountAtom.ts` — 츄르 스틱 개수 (초기값 0)
- `itemSlotsAtom.ts` — 아이템 슬롯 활성화 여부 (초기값 `[false, false, false]`)

### 2. HUD 컴포넌트 분리

`SingleHUD`는 조립만 담당하고, 각 관심사를 별도 컴포넌트로 분리했다.

```
SingleHUD        ← 조립만
├── HUDLives     ← 하트 표시, livesAtom 구독
├── HUDCombo     ← 콤보 숫자, comboAtom 구독
└── HUDItemSlots ← 아이템 슬롯 3개, itemSlotsAtom 구독
```

### 3. 3분할 레이아웃 비율 기반

고정 px 대신 Tailwind 비율 클래스(`w-1/5`, `w-3/5`, `w-1/5`)를 사용했다.  
최소 지원 해상도(1280×720) 이상에서 자연스럽게 늘어나도록 하기 위함.

### 4. SingleScene 껍데기

`create()` / `shutdown()`에 EventBus 등록·해제 위치만 TODO 주석으로 표시했다.  
React import 없이 EventBus 경유만 허용하는 구조.

---

## Why

### atom 파일 분리 이유

Jotai는 atom이 독립적으로 구독되는 구조라, 파일이 분리돼 있어야 트리 쉐이킹이 유효하고 나중에 atom이 복잡해질 때 (파생 atom, 비동기 처리) 파일 내에서 자연스럽게 확장 가능하다.

### HUDLives에서 `MAX_LIVES` 상수 분리 이유

`Array.from({ length: 3 })`과 `atom(3)` 두 곳에 매직 넘버가 중복돼 있었다.  
최대 목숨 수 변경 시 한 곳만 수정하도록 `livesAtom.ts`에서 `MAX_LIVES = 3`으로 관리한다.

### 컴포넌트 내부 스타일 고정 이유

`SingleHUD`는 싱글 게임 페이지에서만 쓰이는 컴포넌트라 재사용 가능성이 없다.  
`className` prop으로 외부 주입을 허용하면 책임이 분산되므로, 내부에서 스타일을 고정하고 레이아웃 크기는 `pages/single/index.tsx`에서 래퍼 div로 결정한다.

---

## Caution

- `pages/single/index.tsx`의 `<Provider>`는 임시 위치다. 라우팅 구조 확정 후 루트 레이아웃으로 이동해야 한다.
- `SingleScene`은 껍데기만 존재하며, Phaser 게임 인스턴스 마운트는 127번 작업에서 진행한다.
- `index.css`의 `#root` 스타일이 전역 레이아웃을 제한하고 있다. 라우팅 구조 확정 후 페이지별 레이아웃으로 분리 필요.
- 츄르 스틱 에셋은 난이도별 3종으로 결정됐으나 아직 미확정. 127번에서 `churuCountAtom`과 난이도 정보를 연결할 때 에셋 확정 필요.

---

## Test Plan

- `livesAtom` 초기값 3 → `HUDLives`에서 하트 3개 모두 채워진 상태로 렌더링 확인
- `livesAtom` 값 감소 → 빈 하트로 전환 확인
- `itemSlotsAtom` 값 `[true, false, false]` → 1번 슬롯만 활성화 스타일 확인
- 1280×720 해상도에서 3분할 레이아웃 깨짐 없는지 확인
