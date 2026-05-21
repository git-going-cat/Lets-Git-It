# IMPLEMENTATION_중첩모달_focus_trap_가드

## Background / Context

`shared/hooks/useModal`은 모달 공통 동작(ESC 닫기, body scroll lock, 자동 포커스, Tab focus trap)을 제공한다. ESC 핸들러는 `modalStack` top 가드를 적용해 중첩 모달에서 가장 위 모달만 닫히도록 되어 있었지만, **Tab focus trap에는 top 가드가 없어** 부모 모달의 Tab 핸들러가 자식 모달의 포커스를 자기 컨테이너로 끌어가는 버그가 있었다.

재현: Win11ExplorerModal에서 게임 시작 → startSession 실패 → 위에 Win11Dialog 마운트 → 사용자가 Tab → 부모(ExplorerModal)의 Tab 핸들러가 발화 → 자식(Win11Dialog) 내부의 포커스가 부모 컨테이너로 빠짐 → 사용자가 [확인] 버튼에 도달하지 못함.

또한 Win11Window 기반 다이얼로그는 `aria-labelledby`(제목)만 연결되어 있고 본문 메시지는 스크린리더가 별도로 읽지 않았다.

---

## Decision

### 1. modalId 할당 + stack push/pop을 별도 useEffect로 분리 — `shared/hooks/useModal.ts`

기존엔 modalId 등록과 ESC 핸들러가 `[isOpen, canClose]` 의존의 단일 effect에 묶여 있어, `onClose`가 없는 모달(canClose=false)은 stack에 push되지 않았다. 자식 모달이 부모의 Tab top 가드를 통과하려면 부모도 stack에 들어가 있어야 하므로, modalId 관리를 `[isOpen]`만 의존하는 별도 effect로 분리한다.

```ts
useEffect(() => {
  if (!isOpen) return;
  if (modalIdRef.current === null) {
    nextModalId += 1;
    modalIdRef.current = nextModalId;
  }
  const modalId = modalIdRef.current;
  modalStack.push(modalId);
  return () => removeModalFromStack(modalId);
}, [isOpen]);
```

ESC 핸들러는 `[isOpen, canClose]` 의존으로 그대로 유지되며 stack push는 더 이상 담당하지 않는다.

### 2. Tab 핸들러에 top 가드 추가

```ts
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return;
  const modalId = modalIdRef.current;
  // top 모달만 Tab을 처리. 가드가 없으면 부모 모달(아래 layer)의 핸들러가
  // 자식 모달 내부의 포커스를 자기 컨테이너로 끌어가 사용자가 Tab으로 자식
  // 모달의 버튼에 도달하지 못한다.
  if (modalId === null || modalStack[modalStack.length - 1] !== modalId) return;
  // ... 기존 focus trap 로직
};
```

### 3. Win11Window `ariaDescribedBy` prop — `shared/components/Win11Window.tsx`

본문 메시지/설명 요소의 id를 dialog div의 `aria-describedby`에 연결한다. 스크린리더가 라벨 + 본문을 함께 읽어준다.

### 4. Win11Dialog — `shared/components/Win11Dialog.tsx` (신규)

Win11Window 기반 단순 확인 다이얼로그. `useId()`로 messageId 생성, `<p id={messageId}>` 부착 후 `ariaDescribedBy={messageId}` 전달.

---

## Why

### Tab 가드를 ESC와 동일 패턴으로 정렬한 이유

ESC는 이미 top 가드를 적용 중이었지만 Tab은 누락이었다. 같은 modalStack 구조에 두 키 처리만 일관성이 깨져 있어 디버깅이 어려웠다. Tab도 top 가드를 적용하면 "modalStack top만 키보드 이벤트를 처리한다"는 단일 원칙으로 좁혀진다.

### modalId 관리를 canClose와 분리한 이유

`canClose=false` 모달(닫을 수 없는 안내 화면 등)도 stack 상으로는 "현재 떠 있는 모달"이다. 자식 모달이 위에 뜨면 자식이 top이 되어야 하고, 그러려면 부모도 stack에 있어야 가드 비교가 성립한다. ESC 처리만 canClose 조건으로 묶고, stack 등록은 모든 isOpen 모달에 동일 적용.

### `containerRef.current?.focus()` 패턴을 유지한 이유

`useModal`은 모달 마운트 직후 *첫 focusable*가 아니라 *컨테이너*에 포커스를 둔다. 이는 직전 keydown(Enter 등)의 key-repeat이 포커스 직후 버튼으로 흘러 들어 의도치 않은 click을 만드는 사고를 막기 위함이다(예: 영상 스킵 Enter → 다시하기 자동 클릭). Tab을 한 번 눌러야 첫 focusable로 진입한다. 접근성을 약간 양보하는 대신 안전성을 택한 결정이며, `aria-describedby`로 스크린리더가 본문을 직접 읽도록 보완.

---

## Caution

- **stack은 모듈 레벨 전역 배열**: 한 페이지에서 useModal 인스턴스 간 공유. 동시에 모달 1개씩만 떠 있는 일반 케이스에는 무해. 동일 모달의 isOpen이 토글될 때 modalId가 한 번만 할당되도록 `modalIdRef`로 가드.
- **canClose=false 모달은 ESC로 닫히지 않는다**: 의도. 명시적으로 onClose를 안 넘긴 모달은 강제로 닫지 못함. 다만 stack에는 들어가 자식 가드 비교에 참여.
- **focus 복귀**: 모달 닫힐 때 `previousActiveElementRef.current?.focus()` 호출로 진입 직전 요소로 복귀. 중첩 모달의 경우 부모 모달의 컨테이너로 돌아가야 함.
- **Win11Dialog 내부 ESC**: Win11Dialog는 `useModal({ isOpen: true, onClose })`로 자기 onClose를 등록하므로 ESC로 자기 자신만 닫힌다. 부모는 영향 없음.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/` 통과
- **중첩 모달 Tab 시나리오**: Win11ExplorerModal 위에 Win11Dialog가 떴을 때 Tab 누르면 다이얼로그 내부 [확인] 버튼에 정상 도달. 부모 모달로 포커스가 빠지지 않는지 확인.
- **중첩 모달 ESC 시나리오**: 다이얼로그 위에서 ESC → 다이얼로그만 닫힘, 부모 모달은 유지.
- **다이얼로그 닫은 후 부모 Tab**: 다이얼로그 [확인] 클릭 후 부모 모달에서 Tab → 부모 컨테이너 내부 순환 정상.
- 스크린리더 점검(NVDA/VoiceOver): 다이얼로그 마운트 시 제목 + 본문이 함께 읽히는지.

---

## 후속 작업

- 향후 Win11 베이스 외에 PixelModal 등 게임 내부 모달에도 `aria-describedby` 표준 적용 검토.
