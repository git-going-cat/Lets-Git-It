# IMPLEMENTATION_routes_wiring_분리

## Background / Context

홈 화면의 모드 선택 모달(`features/home/components/modals/Win11ExplorerModal`)에서 "게임 시작" 클릭 시 다음 동작이 필요하다.

1. `useSingleStore.clearSession()` — 이전 세션 정리
2. `singleApi.startSession(difficulty)` — 새 세션 생성
3. `useSingleStore.setSession(data)` — 결과 반영
4. `navigate('/single')` — 라우팅

기존 구현은 위 1~3을 `features/single`의 모듈(`singleApi`, `useSingleStore`)을 `features/home`에서 직접 import해 처리하고 있었다. FSD 아키텍처상 **feature 간 직접 의존**이며, FE_CONVENTION §15에서 routes 레이어를 wiring 지점으로 두라고 명시한 패턴과 어긋났다.

또한 `/single` 진입 실패 후 홈으로 복귀할 때 어느 모달을 다시 열지 결정할 방법이 없어, 사용자는 항상 홈 화면의 모드 선택 버튼을 다시 클릭해야 했다.

---

## Decision

### 1. `routes/-HomeRoute.tsx` (신규) — wiring wrapper

TanStack Router의 `-` 접두 파일은 라우트 트리에서 자동 제외되므로 헬퍼 컴포넌트로 사용 가능(FE_CONVENTION §15). 이 파일에서만 `features/single` 모듈을 import하고 callback으로 묶어 `HomePage`에 주입한다.

```tsx
export default function HomeRoute() {
  const { modal } = useSearch({ from: '/home' });
  const navigate = useNavigate();

  const onUrlCleanup = useCallback(() => {
    void navigate({ to: '/home', search: {}, replace: true });
  }, [navigate]);

  const onStartSingle = useCallback(async (difficulty: Difficulty) => {
    useSingleStore.getState().clearSession();
    const data = await singleApi.startSession(difficulty);
    useSingleStore.getState().setSession(data);
  }, []);

  return (
    <HomePage
      initialModal={modal ?? null}
      onUrlCleanup={onUrlCleanup}
      onStartSingle={onStartSingle}
    />
  );
}
```

`onStartSingle`은 실패 시 throw하며, Win11ExplorerModal이 catch해 에러 다이얼로그를 띄운다([[세션시작실패_에러다이얼로그]] 참조).

### 2. HomePage props 수신 — `features/home/components/HomePage.tsx`

`useSearch` / `useNavigate` 직접 호출을 제거하고 props로 받는다.

```tsx
interface HomePageProps {
  initialModal: HomeModalType | null;
  onUrlCleanup: () => void;
  onStartSingle: (difficulty: Difficulty) => Promise<void>;
}

export function HomePage({ initialModal, onUrlCleanup, onStartSingle }: HomePageProps) {
  // setState in effect 회피 위해 useState initializer로 처리.
  const [activeModal, setActiveModal] = useState<HomeModalType | null>(() => initialModal);
  // ...
}
```

`activeModal` 초기값을 `initialModal`로 두면 첫 렌더부터 모달이 열린 상태로 시작한다. `useEffect`에서 `onUrlCleanup()`을 즉시 호출해 URL을 비우면 새로고침 시 재오픈을 방지한다.

### 3. `routes/home.lazy.tsx` 컴포넌트 교체

```tsx
import HomeRoute from './-HomeRoute';
export const Route = createLazyFileRoute('/home')({ component: HomeRoute });
```

### 4. `routes/home.tsx` validateSearch 정의

```ts
validateSearch: z.object({
  modal: z.enum(['explorer-single', 'explorer-multi']).optional(),
}),
```

이 파라미터는 `/single` 실패 후 home 복귀 시 어느 모드 모달을 자동 재오픈할지를 지정한다.

### 5. Win11ExplorerModal `onStartSingle` prop 수신

기존 컴포넌트 내부에서 직접 호출하던 startSession을 prop으로 위임한다. 실패 throw는 모달이 catch.

```tsx
interface Win11ExplorerModalProps {
  initialTab: ExplorerTab;
  onClose: () => void;
  onStartSingle: (difficulty: SingleDifficulty) => Promise<void>;
}
```

---

## Why

### `-` 접두 헬퍼 위치를 routes/에 둔 이유

FE_CONVENTION §15는 *feature 간 wiring의 결합 지점*을 routes/로 명시한다. wrapper를 `features/home/` 안에 두면 같은 cross-feature 직접 의존이 발생하고, `features/single/` 안에 두면 single이 home의 wrapper를 export해야 하는 역방향 구조가 된다. routes/는 원래 여러 feature를 조합하는 레이어라 자연스럽다.

### HomePage를 controlled component로 만든 이유

기존 HomePage는 `useSearch` / `useNavigate` / single API/store를 모두 직접 다루는 컴포넌트였다. props로 받게 되면 HomePage는 "UI 조립"만 담당하게 되어 단일 책임이 명확해지고, 테스트 시 mock props 주입만으로 시나리오 검증이 가능해진다.

### `setActiveModal` 초기값을 useState initializer로 둔 이유

`useEffect`에서 `setActiveModal(initialModal)`을 하면 첫 렌더 후 다시 렌더링되어 깜빡임이 생기고 effect 의존성도 복잡해진다. `useState(() => initialModal)`로 두면 첫 렌더부터 정확한 상태로 시작한다. URL 정리는 별도 effect에서 처리.

### `onStartSingle`을 routes 레이어 callback에 둔 이유

`clearSession + startSession + setSession`은 항상 한 묶음으로 호출되어야 하는 트랜잭션이다. Win11ExplorerModal에 풀어두면 향후 다른 진입점(예: /multi 화면 내 단일 모드 진입)에서 같은 묶음을 다시 작성하게 된다. 결합을 routes에 둬서 features는 callback 단일 진입점만 알면 된다.

---

## Caution

- **routes/home.tsx의 `validateSearch`는 lazy 파일이 아니라 정적 라우트 정의에 둔다**: TanStack Router는 search params 스키마를 빌드 타임에 결정한다. lazy 파일에 두면 첫 로드 전 search 검증이 안 된다.
- **`onUrlCleanup`은 `initialModal`이 있을 때만 호출**: 효과 의존성을 `[initialModal, onUrlCleanup]`으로 두고 `if (!initialModal) return`. 모달 없이 진입한 경우는 URL을 건드리지 않음.
- **clearSession이 startSessionError를 false로 리셋**: `initialState`에 `startSessionError: false`가 포함되어 있어 onStartSingle 진입 시 자동 리셋. [[세션시작실패_에러다이얼로그]]의 사이드 이펙트 정합 보장.
- **navigate 직후 unmount되는 모달의 setState**: Win11ExplorerModal에서 `await onStartSingle()` 성공 시 `navigate('/single')` 직후 모달이 언마운트되므로 `setIsStarting(false)`를 호출하지 않는다(catch 분기에서만 호출).

---

## Test Plan

- `npx tsc --noEmit` / `npx eslint src/` / `npm run build` 통과
- 홈 진입 → 모드 선택 클릭 → 모달 오픈 → URL은 `/home`(파라미터 없음)
- `/home?modal=explorer-single`로 직접 진입 → 모달이 첫 렌더부터 오픈 → URL이 즉시 `/home`으로 정리됨 → 새로고침 시 자동 재오픈 없음
- 모달에서 게임 시작 → `/single?difficulty=EASY` 진입 → 정상 게임 시작
- 게임 시작 실패 → 모달 그대로 + Win11Dialog 표시 → 확인 → 다른 모드 재선택 가능
- `/single` 직접 진입 실패 → Win11Dialog 확인 → `/home?modal=explorer-single`로 복귀 + 모달 자동 오픈 → URL 즉시 정리

---

## 후속 작업

- `/multi` 라우트도 cross-feature wiring이 필요해지면 동일 패턴으로 `routes/-MultiRoute.tsx` 도입 검토.
- TutorialRoute가 이미 같은 패턴(`routes/-TutorialRoute.tsx`)을 적용 중이므로 컨벤션 정합.
