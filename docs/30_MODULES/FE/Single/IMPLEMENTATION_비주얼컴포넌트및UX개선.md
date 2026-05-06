# Single_IMPLEMENTATION_비주얼컴포넌트및UX개선

## Background / Context

게임 화면의 시각적 완성도를 높이고 플레이 피드백을 강화하는 작업.  
- 우측 패널의 😸 이모지 → 실제 스프라이트 에셋(cat.png)으로 교체
- 명령어 성공 누적 시각화를 위한 츄르 스택 UI 구현
- 콤보 숫자가 잘 보이지 않는 문제 → 팝 애니메이션 추가
- NES.css 기본 동작으로 인한 CommandInput 오버플로 수정

---

## Decision

### 1. CatSprite — 키보드 연동 스프라이트 (`CatSprite.tsx`)

**에셋**: `src/assets/game/cat.png` — 4프레임 스프라이트시트 (128×80px/프레임, 가로 배치)

| 프레임 | 인덱스 | 조건 |
|--------|--------|------|
| idle | 0 | 입력 없음 (200ms 이후) |
| typing A | 1 | 단일 키 입력 (홀수 번째) |
| typing B | 2 | 단일 키 입력 (짝수 번째) |
| both hands | 3 | 두 키 동시 입력 |

CSS `background-position`으로 프레임 전환. `imageRendering: 'pixelated'`로 픽셀 선명도 유지.

```ts
const FRAME_COUNT = 4;
const FRAME_W = 128;
const FRAME_H = 80;
const DISPLAY_W = 160;
const DISPLAY_H = Math.round(FRAME_H * (DISPLAY_W / FRAME_W)); // 100

// 표시 공식
backgroundSize: `${FRAME_COUNT * FRAME_W * scale}px ${FRAME_H * scale}px`
backgroundPosition: `-${frame * DISPLAY_W}px 0`
```

**키 입력 감지**: `window.addEventListener('keydown'/'keyup')`로 현재 눌린 키를 `heldKeys: Set<string>`에 관리.

- `heldKeys.size >= 2` → frame 3
- 단일 키: `nextFrameRef`(1|2)를 교대 → frame 1 or 2
- 200ms 무입력 후: setTimeout으로 frame 0 복귀
- `e.code` 기준으로 추적 (좌/우 Shift 등 물리 키 구분)
- Ctrl/Alt/Meta 조합 무시

### 2. ChuruStack — 명령어 성공 시각화 (`ChuruStack.tsx`)

**에셋**: `src/assets/game/churu.png`

명령어 정답(SWITCH 제외) 1개당 츄르 1개가 컨테이너 위에서 떨어져 쌓인다.  
총 명령어 수(`totalCommands`)에 따라 step을 조정해 난이도가 높아져도 쌓인 높이가 동일하게 유지된다.

```
step = containerHeight / totalCommands
```

- EASY(~20개): step이 커서 tspu 간격이 넓음
- HARD(명령어 多): step이 작아 겹쳐 쌓임 → 전체 높이는 동일

**레이아웃**: 우측 패널 `flex-1` 영역(고양이 아래). `ResizeObserver`로 실제 containerH를 측정.

**낙하 애니메이션** (ChuruItem 내부):
- 마운트 시 bottom = containerH (컨테이너 상단, 숨겨진 상태)
- 이중 rAF 후 `dropped = true` → `bottom: finalBottom`으로 CSS transition
- `transition: 'bottom 0.4s ease-out'`

```ts
// 스택 위치 (i = 0부터, 0이 가장 아래)
finalBottom = i * step
```

**상태 연동**:
- `churuCountAtom` 구독 → count 증가 시 새 `ChuruItem` 마운트
- `key={i}`로 기존 아이템은 재마운트 없음 (불필요한 애니메이션 방지)
- `containerH > 0` 조건으로 측정 전 렌더 차단

**총 명령어 수 산출** (`SingleGameContent`):
```ts
const totalCommands = useMemo(
  () => commandSet.filter((c) => c.type !== 'SWITCH').length,
  [commandSet],
);
```

### 3. ChuruStack 상태 관리 (`useSingleGame` 변경)

`churuCountAtom`은 기존에 atom만 정의되어 있었으며 이번에 실제로 연결됐다.

- `handleComplete` 내에서 SWITCH 타입 제외 후 `setChuru(prev => prev + 1)` 호출
- `resetGame()`에서 `setChuru(0)` 초기화

```ts
const completedCmd = useSingleStore.getState().commandSet[index];
if (completedCmd && completedCmd.type !== 'SWITCH') {
  setChuru((prev) => prev + 1);
}
```

### 4. HUDCombo 팝 애니메이션 (`HUDCombo.tsx`)

`key={combo}`로 콤보 변경 시마다 span을 remount → CSS 애니메이션 재트리거.

```css
@keyframes combo-pop {
  0%   { transform: scale(1.7); filter: brightness(1.8); }
  100% { transform: scale(1);   filter: brightness(1); }
}
```

- 지속시간: 0.25s ease-out
- `combo > 0`일 때만 애니메이션 적용 (콤보 리셋 시 무반응)

### 5. CommandInput NES.css 오버플로 수정 (`CommandInput.tsx`)

**문제**: NES.css가 `box-sizing: content-box`를 사용해 border(4px) + padding이 width에 추가됨.  
또한 `::before`/`::after` pseudo-element box-shadow가 요소 바깥 4px까지 확장되어 부모의 `overflow: hidden`에 잘림.

**해결**:
1. 외부 wrapper에 `padding: 4px 8px` — NES.css box-shadow(4px) 확장 공간 확보
2. `.nes-container`, `.nes-input` 모두 `boxSizing: 'border-box'` 강제 — border가 width에 포함

```
외부 padding(8px 좌우) ≥ NES.css shadow 확장(4px) → overflow: hidden에 잘리지 않음
box-sizing: border-box + width: 100% → border 포함해 정확히 컨테이너 크기에 맞음
```

추가 정리:
- `with-title` 제거 (title 없이 쓰면 상단 여백 낭비)
- `<p>` 태그 `m-0` 추가 (NES.css 기본 margin 제거)
- padding을 `6px 10px`으로 축소해 160px 높이 영역 내 배치

---

## Why

### CatSprite에 Phaser 대신 CSS background-position을 쓴 이유

고양이 스프라이트는 React UI 영역(우측 패널)에 위치하며 Phaser 캔버스와 무관하다.  
CSS background-position 방식은 별도 Canvas 컨텍스트 없이 React 컴포넌트로 자연스럽게 통합된다.

### heldKeys를 e.key 대신 e.code로 추적하는 이유

좌/우 Shift, 좌/우 Alt 등 같은 문자를 내는 물리 키가 다를 수 있다.  
e.key는 논리 키(출력 문자), e.code는 물리 키(위치)를 나타내므로 동시 입력 감지에 e.code가 더 정확하다.

### ChuruStack에 ResizeObserver를 쓴 이유

우측 패널의 `flex-1` 영역은 화면 크기에 따라 높이가 달라진다.  
하드코딩된 높이 대신 실제 렌더링 높이를 동적으로 측정해야 step 계산이 정확하다.

### ChuruStack에서 key={i}로 기존 아이템을 유지하는 이유

`key`가 같으면 React는 기존 컴포넌트를 재사용한다. 이미 착지한 츄르는 재애니메이션하지 않고,  
새로 추가된 아이템(key=count-1)만 마운트 시 낙하 애니메이션을 재생한다.

### HUDCombo에서 key={combo} remount 전략을 쓴 이유

CSS animation은 요소가 DOM에 처음 마운트될 때 자동 재생된다.  
`key` 변경으로 remount를 트리거하면 animation 클래스를 제거·재추가하는 별도 로직 없이  
매 콤보 변경 시 애니메이션을 자연스럽게 재실행할 수 있다.

### CommandInput에서 NES.css를 직접 오버라이드하지 않는 이유

NES.css 클래스를 제거하면 픽셀 아트 스타일이 사라진다.  
`boxSizing: 'border-box'`와 외부 padding 조정으로 NES.css 스타일을 유지하면서 레이아웃 문제만 해결한다.

---

## Caution

- `totalCommands`가 0이면 step 계산에서 `Math.max(totalCommands, 1)`로 나눗셈 오류 방지.
- `churuCountAtom`은 SWITCH 타입 명령어를 제외하고 증가한다. `totalCommands` 계산도 동일하게 SWITCH를 제외해야 step이 정확히 맞는다.
- API 연동 전까지 `commandSet`은 mock 데이터다. API 연동 후 실제 SWITCH 제외 명령어 수 검증 필요.
- CatSprite는 게임 상태와 무관하게 항상 키 입력에 반응한다. 일시정지 / 게임오버 상태에서도 타이핑하면 고양이가 움직인다. 의도된 동작이지만 필요 시 `gameStatusAtom` 구독 후 `isPlaying`이 아닐 때 비활성화 가능.
- ChuruItem은 `containerH > 0` 이전에는 렌더되지 않는다. ResizeObserver가 발화하기 전 count가 증가하면 그 항목들은 측정 완료 후 한꺼번에 렌더된다 (애니메이션은 각각 독립적으로 재생됨).

---

## Test Plan

- 단일 키 입력 → frame 1 → 2 → 1 → 2 교대 확인
- 두 키 동시 입력 (예: a + s) → frame 3 표시 확인
- 200ms 무입력 → frame 0 복귀 확인
- 명령어 정답 → 츄르 1개 낙하·착지 확인
- SWITCH 명령어 정답 → 츄르 증가 없음 확인
- game:restart 후 츄르 스택 초기화 확인
- 콤보 증가 시 숫자 팝 애니메이션 확인
- 콤보 리셋(0) 시 팝 애니메이션 없음 확인
- CommandInput이 160px 영역 내에 잘리지 않고 표시되는지 확인
- NES.css 픽셀 아트 테두리가 잘리지 않는지 확인
