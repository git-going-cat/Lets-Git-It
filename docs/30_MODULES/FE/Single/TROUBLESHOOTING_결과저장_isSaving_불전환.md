# TROUBLESHOOTING_결과저장_isSaving_불전환

## 증상

싱글 게임 종료 후 결과 모달에서 "점수 저장 중..." 텍스트가 서버 200 OK 응답 이후에도 사라지지 않음.  
네트워크 탭에서 `POST /single/sessions/{id}/result`가 200을 반환했지만 `isSaving` 상태가 `false`로 전환되지 않는다.

---

## 진단

### 1단계 — useMutation lifecycle 추적

`useMutation` 핸들러에 로그를 추가해 확인한 결과:

```
[DEBUG] mutationFn START    ✓
[DEBUG] mutationFn RESOLVED ✓
[DEBUG] onSuccess fired     ✓
[DEBUG] onSettled fired     ✗  ← 여기서 멈춤
mutation state (isSaving)   ✗  false로 전환 안 됨
```

`onSuccess`까지는 실행되지만 `onSettled`와 mutation state 전환(`isPending → false`)이 발생하지 않는다.

### 2단계 — StrictMode 이중 마운트 확인

개발 환경 React StrictMode에서 `ResultModal`의 mount/unmount 로그:

```
[DEBUG] MOUNTED
[DEBUG] UNMOUNTED    ← StrictMode cleanup
[DEBUG] MOUNTED      ← 두 번째 마운트
```

### 3단계 — 근본 원인 파악

**`cancelled` 플래그 + `savedSessionRef` 가드의 조합 문제**

StrictMode는 개발 환경에서 effect를 mount → cleanup → remount 순서로 두 번 실행한다.

| 단계 | 동작 |
|------|------|
| 1차 mount effect | `savedSessionRef.current = sessionId` 세팅 → API 호출 시작 |
| StrictMode cleanup | `cancelled = true` 설정 |
| 2차 mount effect | `savedSessionRef.current === sessionId` 가드 → 조기 return, API 재호출 없음 |
| 1차 호출 응답 도착 | `.then()` → `if (cancelled) return` → `setIsSaving(false)` 미실행 |

`savedSessionRef` 가드가 중복 API 호출을 막는 것은 정상이다. 그러나 `cancelled` 플래그를 함께 사용하면 2차 effect가 새 API 호출을 시작하지 않은 상태에서, 1차 호출의 응답 핸들러도 `cancelled`로 차단되어 **`setIsSaving(false)`를 실행할 경로가 사라진다**.

추가로, TanStack Query `useMutation` 자체도 Jotai `<Provider>` 내부에서 StrictMode observer 구독 해제 경쟁 조건이 발생해 `isPending → success` 전환이 안 되는 별도 증상이 확인됐다. (동일 패턴의 `useEditCharacter.ts`는 `<Provider>` 밖에서 정상 작동)

---

## 해결

### 파일: `FE/src/features/single/hooks/useResultModal.ts`

`useMutation`을 제거하고 `singleApi.saveResult`를 직접 호출 + `useState`로 상태를 명시적으로 관리한다.

**핵심 변경:**
- `useMutation` 제거
- `isSaving`, `saveData`, `saveError`를 `useState`로 직접 관리
- `.then`/`.catch` 내 가드를 **`cancelled` 플래그 없이 `savedSessionRef.current !== sessionId`로만** 처리

```ts
const [isSaving, setIsSaving] = useState(false);
const [saveData, setSaveData] = useState<{ isNewRecord: boolean } | null>(null);
const [saveError, setSaveError] = useState(false);

useEffect(() => {
  if (!result || !sessionId) return;
  if (result.status === 'SESSION_EXPIRED') return;
  if (savedSessionRef.current === sessionId) return;  // 중복 저장 방지
  savedSessionRef.current = sessionId;

  setIsSaving(true);
  setSaveError(false);

  singleApi
    .saveResult(sessionId, { ... })
    .then((data) => {
      if (savedSessionRef.current !== sessionId) return;  // stale 응답 차단
      setSaveData(data);
      setIsSaving(false);
      void queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
    })
    .catch(() => {
      if (savedSessionRef.current !== sessionId) return;
      setSaveError(true);
      setIsSaving(false);
    });
}, [result, sessionId, queryClient]);
```

**`cancelled` 플래그를 제거한 이유**

`savedSessionRef` 가드는 이미 "이 세션에 대한 응답인지"를 검증한다.  
`cancelled`를 추가하면 StrictMode cleanup에서 1차 effect의 cancelled가 `true`가 되고, 2차 effect는 `savedSessionRef` 가드로 API 재호출을 건너뛰기 때문에 **응답을 처리할 핸들러가 없는 데드락 상태**가 된다.  
`onRestart` 시 `savedSessionRef.current = null`로 리셋되므로 세션 전환 후 stale 응답 차단도 동일하게 처리된다.

### 다시하기 중복 클릭 방지 (`isRestarting`)

`onRestart`가 `await singleApi.startSession()`을 포함한 async 함수임에도 버튼에 disabled 처리가 없어, 느린 네트워크에서 연속 클릭 시 세션이 중복 생성될 수 있었다. `isRestarting` 상태를 추가해 요청 중 버튼을 비활성화한다.

```ts
const [isRestarting, setIsRestarting] = useState(false);

const onRestart = async () => {
  if (!difficulty || isRestarting) return;
  setIsRestarting(true);
  // ... startSession 호출
  // 성공 시 컴포넌트가 리셋되므로 setIsRestarting(false) 불필요
};
```

```tsx
// ResultModal.tsx
<PixelButton label="↺  다시하기" onClick={onRestart} variant="primary" disabled={isRestarting} />
```

---

## 관련 파일

- `FE/src/features/single/hooks/useResultModal.ts`
- `FE/src/features/single/components/ResultModal.tsx`

---

## 재현 조건

- React StrictMode 활성 상태 (개발 환경 기본)
- `useMutation` lifecycle 문제는 Jotai `<Provider>` 내부에서 발현 확인
- 프로덕션 빌드(`StrictMode` 비활성)에서도 `useMutation` observer 경쟁 조건은 잠재적으로 존재
