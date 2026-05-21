# Single_IMPLEMENTATION_세션시작실패_에러다이얼로그

## Background / Context

`singleApi.startSession()`이 실패하는 경로는 세 곳이다.

1. **URL 직접 진입** (`/single?difficulty=EASY`) — `SinglePage.useEffect`에서 호출.
2. **PauseModal 다시하기** — `usePauseModal.onRestart`.
3. **ResultModal 다시하기** — `useResultModal.onRestart`.

기존 처리는 세 경로 모두 `catch → navigate({ to: '/home', replace: true })` 였다. 사용자 입장에서는 화면이 갑자기 홈으로 튕기고 *왜* 실패했는지 알 수 없다. 특히 PauseModal/ResultModal에서 다시하기는 게임 결과 화면이 즉시 사라지는 형태라 UX 손실이 크다.

또한 모드 선택은 홈 → Win11ExplorerModal → `/single` 라우팅이 순서대로 일어나는데, 실패가 `/single`로 넘어간 뒤 발견되면 검은 화면 + 홈 복귀라는 두 번의 라우팅 전환이 일어난다.

---

## Decision

### 1. `startSessionError` 플래그 도입 — `features/single/store/singleStore.ts`

세션 시작/다시하기 실패 시 boolean 플래그를 set한다.

```ts
interface SingleSessionState {
  // ...
  startSessionError: boolean;
}

setStartSessionError: (value) => set({ startSessionError: value }),
```

`clearSession()`은 `initialState`(startSessionError: false 포함)로 리셋하므로 새 세션 진입 시 자동으로 비워진다.

### 2. Win11Dialog 공통 다이얼로그 — `shared/components/Win11Dialog.tsx` (신규)

Win11Window 기반의 단순 확인 다이얼로그. 제목 + 메시지 1줄 + [확인] 버튼만 제공한다. 게임 외부(데스크탑) 영역의 에러/안내 표시 전용. 게임 내부 모달은 기존 PixelModal/NES container 사용.

### 3. SinglePage가 단일 마운트 지점 — `features/single/components/SinglePage.tsx`

세션 진입 실패 + PauseModal/ResultModal 다시하기 실패 모두 동일한 store 플래그를 구독하므로, Win11Dialog는 SinglePage에서 한 번만 마운트한다.

```tsx
return (
  <>
    {!sessionId ? <LoadingScreen /> : <Provider>{/* 게임 */}</Provider>}
    {startSessionError && (
      <Win11Dialog
        title="게임 시작 실패"
        message={'서버에서 응답을 받지 못했어요.\n잠시 후 다시 시도해 주세요.'}
        onClose={handleErrorDialogClose}
      />
    )}
  </>
);
```

`handleErrorDialogClose` 분기:

- `sessionId` 있음 — 다시하기 실패 경로. 플래그만 false로 두고 머무름. PauseModal/ResultModal이 그 자리에 다시 보여 사용자가 같은 버튼으로 재시도 가능.
- `sessionId` 없음 — URL 직접 진입 실패. `/home`으로 복귀하면서 `?modal=explorer-single` 검색 파라미터를 붙여 모드 선택 모달을 자동 재오픈.

### 4. Win11ExplorerModal에서 게임 시작 실패 즉시 표시

기존엔 모드 선택 모달에서 게임 시작 버튼 → `navigate('/single')` → SinglePage가 startSession 호출. 실패 시 검은 로딩 화면을 거쳐 에러가 표시되었다.

개편: Win11ExplorerModal이 wiring callback `onStartSingle(difficulty)`을 await하고, **성공 시에만** `/single`로 navigate한다. 실패 시 모드 선택 화면 위에 Win11Dialog가 뜨며 사용자는 다른 모드를 즉시 다시 선택 가능.

```tsx
try {
  await onStartSingle(difficulty);
  // navigate 직후 모달이 언마운트되므로 setIsStarting(false)는 호출하지 않는다.
  void navigate({ to: '/single', search: { difficulty } });
} catch {
  setStartError(true);
  setIsStarting(false);
}
```

### 5. useResultModal reset 위치 — `features/single/hooks/useResultModal.ts`

`onRestart`에서 `setSaveData(null) / setSaveError(false) / setIsSaving(false) / savedSessionRef.current = null` 4줄을 try 블록 안 — `await singleApi.startSession()` 성공 직후 — 으로 이동했다. 실패 시 기존 saveData/saveError를 보존해, 사용자가 다이얼로그를 닫고 ResultModal로 복귀했을 때 `isNewRecord` 표시가 서버 응답 그대로 유지된다.

### 6. `/home` validateSearch에 `modal` 파라미터 추가 — `routes/home.tsx`

```ts
validateSearch: z.object({
  modal: z.enum(['explorer-single', 'explorer-multi']).optional(),
}),
```

HomePage가 `initialModal`로 한 번 읽고 즉시 URL을 정리해(`navigate({ to: '/home', search: {}, replace: true })`) 재진입 시 자동 재오픈을 방지한다.

---

## Why

### 플래그를 store에 둔 이유

세 경로(SinglePage 초기 진입 / PauseModal / ResultModal) 모두 서로 다른 컴포넌트/훅에서 set한다. local state로 두면 컴포넌트 간 sibling 통신이 필요해지고, 컨텍스트 도입은 오버엔지니어링이다. Zustand는 이미 sessionId 등을 들고 있는 단일 진입점이라 자연스럽다.

### 다이얼로그를 sibling 한 곳에만 마운트한 이유

`!sessionId` / `sessionId` 두 분기에 같은 다이얼로그를 복붙하면 변경 시 두 곳 모두 수정해야 한다. 다이얼로그는 Phaser/Jotai Provider와 독립이므로 sibling 위치에 두면 같은 한 곳에서 관리된다.

### Win11ExplorerModal에서 검은 화면 회피

`/single` 라우트는 로딩 중 검은 배경에 "세션을 준비하는 중..." 텍스트만 보여준다. 실패 시 이 화면 위에 다이얼로그를 띄우면 *왜 검은 화면인지* 사용자가 직관적으로 알 수 없다. 모드 선택 화면 위에 띄우면 컨텍스트가 유지된 채 피드백이 즉시 전달된다.

### `sessionId` 분기로 동작을 나눈 이유

URL 직접 진입 실패는 세션이 없는 상태고, 다시하기 실패는 직전 세션이 살아있는 상태다. 전자는 home으로 복귀해 모드를 다시 선택해야 의미가 있고, 후자는 현재 세션을 유지한 채 다시 시도해야 한다. sessionId 한 가지로 두 경로를 정확히 구분 가능.

### `useResultModal.onRestart`의 reset을 뒤로 미룬 이유

기존 코드는 retry 시작 시점에 `saveData`를 null로 비웠다. 실패 시 saveData 복구 경로가 없으므로(useEffect는 result/sessionId 변경 없어 재실행 안 됨) `isNewRecord` 표시가 서버 응답에서 클라이언트 추정 fallback으로 바뀐다. reset을 startSession 성공 직후로 옮기면 실패 케이스에서 saveData가 보존된다.

---

## Caution

- **다이얼로그 stack과 모달 stack 상호작용**: 다이얼로그가 떠 있는 동안 PauseModal/ResultModal이 살아있을 수 있다. `useModal`의 Tab/ESC top 가드가 활성되어 있어야 부모 모달의 핸들러가 다이얼로그를 가로채지 않는다([[focus_trap_가드]] 참조).
- **재시도 반복 시 stale state 누적 없음**: `setStartSessionError(false)` 후 사용자가 다시하기 버튼을 다시 누르면 동일 catch 경로를 거친다. ResultModal의 `savedSessionRef.current`는 동일 sessionId면 그대로 유효.
- **URL `?modal=explorer-single` 자동 정리**: HomePage가 첫 렌더에 `activeModal`로 반영한 뒤 effect에서 `navigate({ to: '/home', search: {}, replace: true })`로 URL을 비운다. 새로고침 시 모달이 재오픈되지 않게 하기 위함.
- **PauseModal/ResultModal 자체는 닫히지 않음**: catch가 set하는 건 `startSessionError`뿐. 모달의 visibility는 `gameStatus`/`result` 기반이라 그대로 유지.

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/` / `npm run build` 통과
- **URL 직접 진입 실패**: 네트워크 차단 상태로 `/single?difficulty=EASY` 진입 → 검은 로딩 + Win11Dialog → 확인 → `/home?modal=explorer-single`로 복귀 + 모드 선택 모달 자동 오픈 → URL이 `/home`으로 정리됨
- **모드 선택에서 실패**: 네트워크 차단 후 게임 시작 클릭 → 모달 위에 Win11Dialog → 다른 모드 선택 후 재시도 정상
- **PauseModal 다시하기 실패**: 게임 중 ESC → 다시하기 → BE 일시 차단 → Win11Dialog → 확인 → PauseModal 그대로 유지 + 게임 상태 보존 → 다시하기 재시도 정상
- **ResultModal 다시하기 실패**: 게임 종료 후 다시하기 → BE 일시 차단 → Win11Dialog → 확인 → ResultModal에 isNewRecord/점수 그대로 표시 → 다시하기 재시도 정상
- 다이얼로그 ESC/확인 모두 동일하게 onClose 발화

---

## 후속 작업

- 에러 메시지를 응답 코드별로 세분화(401/5xx 분리)할지 검토 — 현 시점에는 단일 안내로 충분.
