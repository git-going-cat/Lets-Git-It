# 프론트엔드 개발 컨벤션 (Game Edition)

## 1. 기술 스택 원칙

- View(UI): React 19 + Tailwind CSS
- Game Engine: Phaser 4 (React와 별도 레이어로 격리)
- 상태 관리:
  - 서버 상태: TanStack Query (로컬 스토어 복제 금지)
  - 인게임 상태: Jotai (점수, 콤보 등 빈번한 렌더링)
  - 전역 메타 상태: Zustand (유저 정보, 방 코드, 설정)
- 데이터 검증: Zod (모든 API 및 WebSocket 패킷 검증 필수)
- 폼 처리: React Hook Form + Zod resolver (`zodResolver`로 스키마 연결)

## 2. 레이어드 아키텍처

- View (React UI): 공통 UI 및 게임 레이어 렌더링
- Logic (Hooks): React 상태와 게임 엔진 간 이벤트 중재 (EventBus 활용)
- Engine (Phaser): 순수 게임 렌더링 및 물리 연산 (React import 금지)

## 3. 개발 규칙

- Phaser ↔ React: 직접 참조 금지, EventBus를 이용한 이벤트 기반 통신
- EventBus 이벤트명: 'domain:action' 형태 (game:pause, score:update)
- Phaser Scene 생명주기: create()에서 EventBus 등록, shutdown()에서 반드시 해제
- Phaser Scene EventBus 핸들러: 클래스 필드 화살표 함수로 정의, context 인자 사용 금지
- Scene 안에서 React import 금지
- WebSocket: core/socket/SocketManager.ts를 통해서만 연결
- Zod 적용 범위:
  - REST API 응답: `.parse()` 허용 — throw는 React Query `error` 상태로 잡혀 컴포넌트 분기 또는 ErrorBoundary가 처리
  - 게임 중 WebSocket 패킷: `.safeParse()` 필수 — 실패 시 로그 후 폐기, UI 중단 없음
  - React Hook Form resolver: zodResolver 내부에서 처리되므로 별도 호출 불필요
- 성능: 60FPS 보존을 위해 빈번한 업데이트는 Jotai atom 또는 엔진 내부 변수 활용

## 4. 컴포넌트 설계 규칙

- 데이터 가공, 이벤트 처리, EventBus 구독은 Custom Hook으로 분리
- 컴포넌트는 "어떻게 보여줄 것인가"만 담당
- useEffect 3개 이상이면 hook 분리 우선 검토. 단, **콜드 마운트 / 키 입력 / 리사이즈처럼 의미가 명확히 다른 effect는 4개 이상도 허용** — 단순히 분리되어 있는 effect를 억지로 합치지 말 것
- Phaser Scene 이벤트 구독은 useEffect + cleanup 필수
- 게임 로직(점수 계산 등)은 Scene 안에 작성 금지, shared/utils/로 분리

### 4-1. 함수 선언 방식

**컴포넌트·훅 → `function` 키워드**
**내부 함수·핸들러 → arrow function**

```tsx
// ✅ 컴포넌트: function 키워드
export default function SingleHUD({ score }: SingleHUDProps) {
  // ✅ 내부 핸들러: arrow function
  const handlePause = () => { ... };
  const formatScore = (n: number) => n.toLocaleString();

  return <div onClick={handlePause}>{formatScore(score)}</div>;
}

// ✅ 훅: function 키워드
export function useSingleGame() {
  const handleKeyDown = (e: KeyboardEvent) => { ... };
  return { handleKeyDown };
}
```

**예외 (arrow function을 컴포넌트에 사용해도 되는 경우)**

```tsx
// ✅ memo + displayName 명시가 필요한 경우
const ScoreBoard = memo(function ScoreBoard(props: ScoreBoardProps) {
  return <div>{props.score}</div>;
});

// ✅ forwardRef로 ref를 전달해야 하는 경우
const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(props, ref) {
    return <input ref={ref} {...props} />;
  },
);

// ✅ 호이스팅이 반드시 필요한 경우 (선언 이전에 참조)
function Parent() {
  return <Child render={renderItem} />;

  function renderItem() {
    // ← 호이스팅으로 위에서 참조 가능
    return <span />;
  }
}
```

> **판단 기준**: "이 함수가 컴포넌트 트리의 노드인가?" → `function` 키워드. "이 함수가 컴포넌트 내부의 동작인가?" → arrow function.

## 5. 주석 규칙

- Hook, Util, Phaser Scene에는 JSDoc 필수
- 페이지 루트 컴포넌트(`*Page.tsx`)는 JSDoc 권장 — 화면의 책임/데이터 출처 한 줄
- 일반 UI 컴포넌트는 JSDoc 강제 아님 — 대신 Props 타입과 컴포넌트명으로 의도를 표현
- 복잡한 수치 연산 (점수 계산, 좌표 계산 등)에는 라인 주석 필수
- 명백한 코드에는 주석 금지

## 6. 네이밍 규칙

- 컴포넌트 파일: PascalCase (SingleHUD.tsx)
- **페이지 루트 컴포넌트 파일: `Page` 접미사 필수** (HomePage.tsx, SinglePage.tsx)
- 훅/유틸/atom 파일: camelCase (useGameBridge.ts, scoreAtom.ts)
- Jotai atom 변수: Atom 접미사 필수 (scoreAtom, livesAtom)
- Phaser Scene 클래스: PascalCase + Scene 접미사 (SingleScene, CoopScene)
- Props 타입: 컴포넌트명 + Props (SingleHUDProps)
- Interface에 I 접두사 금지 (User O, IUser X)
- Jotai atom 파일: atom 단위로 파일 분리 (livesAtom.ts, comboAtom.ts) — 한 파일에 모으지 말 것

## 7. Import 순서

1. External (react, jotai, phaser 등)
2. Internal (@/ 절대 경로)
3. Relative (../, ./)
4. Types (import type)
5. Styles

- eslint-plugin-simple-import-sort로 자동 정렬 적용 중 (수동 정렬 불필요)

## 8. 데이터 통신

- `any` 타입 사용 금지, 모든 API 응답은 Zod 스키마 검증 후 사용
  - **외부 라이브러리/SDK 경계에서는 좁은 캐스팅(`as { specific shape }`) 허용** — 단 `any`/`unknown` 그대로 흘리는 건 금지
  - axios error는 `isAxiosError` + 좁은 캐스팅으로 통일
- 컴포넌트 내부에서 직접 axios 호출 금지
- features/{domain}/api에 정의된 함수를 TanStack Query와 조합하여 호출
- WebSocket 송신/수신 함수는 `features/{domain}/socket/`에 분리 (REST와 분리)
- **인프라 레이어 예외**: `core/http.ts`의 인터셉터, `core/socket/` 등 인프라 코드에서는 raw axios/socket.io 사용 허용. 단 `core/` 외부에서는 금지 — 항상 인프라 레이어가 제공하는 단일 진입점만 사용

## 9. 경로 사용

- `../` 두 번 이상 → 절대경로
- `../` 한 번이면 → 상대경로
- ex) `features/game` 안의 파일들을 참조한느 경우 상대경로, `features/game` 안의 파일을 수정 중인데 `features/auth` 나 `shared/button` 과 같은 식으로 다른 폴더로 나가는 경우 절대경로

## 10. 테스트 규칙 (Vitest)

- 테스트 환경: jsdom
- 테스트 대상 우선순위: shared/utils/ > features/_/hooks/ > features/_/api/
- Phaser Scene은 Canvas 의존성으로 인해 테스트 제외
- 테스트 파일 위치: 대상 파일과 동일 디렉토리 (same-dir 방식)
  - 예: scoreCalculator.ts → scoreCalculator.test.ts
- 게임 중 WebSocket 패킷(.safeParse() 실패)은 로그만 기록하고 폐기

## 11. 에러 처리 규칙

- 전역 ErrorBoundary: 라우트 최상단에 배치, 예상 못한 런타임 에러 캐치
- TanStack Query: `throwOnError: false` (전역 throw 비활성화), `retry: 1`
- REST API의 `.parse()` throw → React Query `error` 상태로 전파 → 컴포넌트 `error` 분기 또는 ErrorBoundary가 처리
- 401 응답: axios interceptor에서 Refresh Token 재발급 시도
  - 성공 → 원래 요청 자동 재시도
  - 실패 → `clearAuth()` + 로그인 페이지로 **router navigate** (`window.location.href` 직접 사용 금지 — SPA 상태 손실)
  - reissue는 `core/http.ts` 단일 경로로 통합 — 다른 곳에서 raw axios로 재호출 금지
- 게임 중 WebSocket 에러: 재연결 시도 후 실패 시 모달 표시 → 대기실 이동 (BE 합의 후 확정)
- Zod safeParse 실패: `console.error` 로그 후 해당 패킷 폐기, UI 중단 없음
- **Form 제출 가드**:
  - `<form onSubmit>` 사용 (Enter 키 제출 보장)
  - mutation `isPending` 동안 제출 버튼 `disabled` 강제 (더블 클릭 방지)
  - 위험 동작(회원탈퇴, 비밀번호 변경 등)은 confirm 모달 + `isPending` 가드 둘 다

## 12. 환경변수 규칙

- `VITE_` 접두사 필수 (없으면 클라이언트에서 접근 불가)
- 환경변수는 직접 `import.meta.env`로 접근하지 않고 `src/config/env.ts`에서만 참조
- `config/env.ts`에서 Zod 스키마로 모든 키 검증 — 필수 키 부재 시 앱 부팅 시점에 throw로 즉시 실패
- `.env.local`은 개인 로컬 설정용, 반드시 `.gitignore`에 포함
- 분석/모니터링 키(Sentry/Faro/PostHog 등)도 동일 — 빈 키일 때 init 호출 금지(가드 필수)

## 13. WebSocket 생명주기

- 연결: 방 입장 확정 시 (`SocketManager.connect`)
- 해제: 방 완전 이탈 / 홈 이동 시 (`SocketManager.disconnect`)
- **단일 진입점**: 모든 송수신은 `SocketManager.emit(event, payload)` / `SocketManager.on(event, handler)` 경유. 컴포넌트/훅에서 직접 `io()`/`socket.emit` 금지
- **토큰 핸드셰이크**: 쿼리스트링 금지(access log 노출). Socket.IO `auth` 옵션 또는 첫 메시지로 전달
- **패킷 직렬화**: JSON 고정
- **이벤트 명명 충돌 방지**: EventBus는 `'domain:action'`(콜론), Socket은 `'domain.action'`(점)으로 구분
- **수신 → 상태 반영**: hook 경유 (`useRoomSocket` 등). atom/store 직접 업데이트는 hook 안에서만, Phaser Scene 안에서 React 상태 라이브러리 호출 금지(컨벤션 2장 레이어 분리)
- 재연결 전략: BE 합의 후 확정
- 게임 중 연결 끊김 처리: BE 합의 후 확정
- payload size / rate limit: BE 합의 후 확정

## 14. 지원 해상도

- 최소 지원 해상도: 1280 × 720
- 모바일: 미지원
- Phaser 캔버스: 고정 사이즈 또는 letterbox 스케일링
- Tailwind 기준 breakpoint: FE/디자인 합의 후 확정

## 15. 상태 관리 사용 규칙

### Jotai

- atom은 관심사 단위로 파일을 분리해서 배치 — 중앙 store 파일 하나에 모으지 말 것
  - ✅ `features/single/store/livesAtom.ts`, `features/single/store/scoreAtom.ts`
  - ❌ `features/single/store/singleStore.ts` (Zustand 방식, Jotai에서는 금지)
- 파생 관계인 atom끼리는 같은 파일에 둬도 무방

```ts
// scoreAtom.ts
export const comboAtom = atom(0);
export const bonusAtom = atom((get) => get(comboAtom) * 10); // 파생 atom
```

### Zustand

- 도메인별로 store를 분리 — 하나의 거대한 store 금지
  - ✅ `features/auth/store/authStore.ts`, `features/multi/store/multiStore.ts`
  - ❌ 모든 전역 상태를 `useStore` 하나에 몰아넣기

### TanStack Query

- 서버에서 받은 데이터를 Zustand/Jotai에 중복 저장 금지 — Query가 서버 상태를 단독 관리

```ts
// ❌ 이중 관리
const { data } = useQuery({ queryKey: ["ranking"], queryFn: fetchRanking });
useEffect(() => {
  useRankingStore.setState({ ranking: data });
}, [data]);

// ✅ data 그대로 사용
const { data: ranking } = useQuery({
  queryKey: ["ranking", mode],
  queryFn: () => fetchRanking(mode),
});
```

**예외 1 — 게임 세션 초기화 데이터:**

Phaser Scene은 React 컨텍스트에 접근할 수 없으므로, Phaser가 직접 읽어야 하는 게임 초기화 데이터(커맨드셋, 세션 ID 등)는 TanStack Query 대신 `useEffect`에서 API를 직접 호출한 뒤 Zustand store에 저장하는 패턴을 허용한다.

```ts
// ✅ Phaser가 접근해야 하는 게임 세션 데이터 — useEffect + Zustand 직접 저장 허용
useEffect(() => {
  singleApi.startSession(difficulty)
    .then((data) => useSingleStore.getState().setSession(data))
    .catch(() => navigate({ to: '/home', replace: true }));

  return () => { useSingleStore.getState().clearSession(); };
}, [difficulty]);
```

**예외 2 — 새로고침 즉시 표시가 필요한 사용자 식별/세션 정보:**

인증 토큰과 함께 관리되는 사용자 프로필(닉네임, onboardingStatus, 캐릭터 자산 등)은 persist된 Zustand store에 보관해도 된다. 새로고침 직후 첫 frame에서 헤더/사이드바/홈 캐릭터 등이 빈 상태로 노출되는 UX 손실을 막기 위함. 이 경우에도:

- 동일 엔드포인트를 React Query에서 별도 queryKey로 또 호출하지 말 것 (Zustand selector 또는 단일 queryKey 캐시 공유)
- mutation 후 Zustand 갱신 + Query invalidate 둘 다 호출해 단일 truth source 유지

```ts
// ✅ persist된 authStore.user — 새로고침 즉시 표시
const character = useAuthStore((s) => s.user?.character);

// ✅ mutation 시 둘 다 갱신
saveCharacterMutation.onSuccess = (_, asset) => {
  useAuthStore.getState().updateUser(asset);
  queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
};
```

### TanStack Router

- 라우트 타입 수동 정의 금지 — `routeTree.gen.ts` 자동 생성 타입 그대로 사용
- search params 검증은 Zod와 연동
- `pages/` 폴더 사용 금지 — **Feature-Driven 아키텍처**를 따른다

#### Feature-Driven 라우팅 구조

`routes/`는 **라우팅 컨트롤러**만 담당하고, 실제 화면과 로직은 `features/`에 응집한다.

| 레이어          | 위치                                         | 담당                                                                                |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| 라우팅 컨트롤러 | `routes/`                                    | path 정의, loader, beforeLoad, validateSearch, errorComponent/pendingComponent 지정 |
| 페이지 컴포넌트 | `features/{domain}/components/XxxPage.tsx`   | 화면 조립 (Page 접미사 필수)                                                        |
| 비즈니스 로직   | `features/{domain}/hooks/`, `api/`, `store/` | 데이터 패칭, 상태 관리, 이벤트 처리                                                 |
| 공통 UI         | `shared/`                                    | ErrorFallback, LoadingSpinner 등 라우트 공용 컴포넌트                               |

```ts
// ✅ routes/home.tsx — 컨트롤러 역할만
import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/components/HomePage";
import { RouteErrorFallback } from "@/shared/components/RouteErrorFallback";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";

export const Route = createFileRoute("/home")({
  beforeLoad: ({ context }) => {
    // 권한 가드
  },
  validateSearch: z.object({
    mode: z.enum(["contribution", "timeattack", "coop"]).optional(),
  }),
  loader: ({ context }) => {
    // 데이터 패칭 (필요 시)
  },
  component: HomePage,
  errorComponent: RouteErrorFallback,
  pendingComponent: LoadingSpinner,
});

// ✅ features/home/components/HomePage.tsx — 화면 조립
export function HomePage() {
  const { mode } = Route.useSearch();
  // ...
}
```

```tsx
// ❌ routes/에 UI 로직 작성 금지
export const Route = createFileRoute("/home")({
  component: () => {
    const [tab, setTab] = useState("single"); // ← features/로 이동해야 함
    return <div>...</div>;
  },
});
```

### Zod

- 게임 중 WebSocket 패킷은 `.safeParse()` 필수 — `.parse()`는 throw하므로 게임 중 사용 금지
- **스키마 파일 위치**: 사용하는 feature 안 `schemas/` 폴더에 배치 — 최상위 `schemas/` 폴더 사용 금지
  - WebSocket 패킷 스키마: `features/{domain}/schemas/{domain}.schema.ts`
  - React Hook Form resolver 스키마: `features/{domain}/schemas/{form}.schema.ts`

```ts
// ❌ 게임 중 터짐
const packet = GamePacketSchema.parse(rawData);

// ✅ 실패해도 게임 유지
const result = GamePacketSchema.safeParse(rawData);
if (!result.success) {
  console.error("잘못된 패킷:", result.error);
  return;
}
```

### Phaser ↔ React

- React에서 Phaser Scene 직접 참조 금지 — EventBus 경유만 허용

```ts
// ❌ 강결합
const scene = gameInstance.scene.getScene("SingleScene") as SingleScene;
scene.pauseGame();

// ✅ EventBus 경유
EventBus.emit("game:pause");
```

---

## 16. Tailwind CSS 크기 규칙

크기(width, height, padding, margin, gap, z-index 등)는 다음 **순서**로 결정:

1. **기본 스케일 클래스 우선** — `w-32`, `p-4`, `gap-2`, `z-50`
2. 공통으로 쓰이는 특수 크기는 **`tailwind.config.ts`의 `theme.extend`** 에 등록 후 토큰화
3. 그래도 표현 불가능한 경우에만 **임의값 + 주석으로 사유 명시** (`w-[1040px] /* Win11 explorer 고정 폭 */`)

```ts
// tailwind.config.ts
theme: { extend: { width: { hud: '8rem', churu: '9rem' }, zIndex: { '60': '60', '100': '100' } } }
// 사용: w-hud, z-60, z-100
```

- ❌ `z-60` (Tailwind 기본 토큰 아님 — `theme.extend.zIndex`에 등록 필요)
- ❌ `w-[128px]`을 단순 16배수 회피로 사용

### 인라인 `style={{}}` 예외 — dynamic 값

런타임에 계산되는 값(드래그 좌표, depth 기반 indent, 스크롤 위치 등)은 Tailwind로 표현 불가능하므로 **인라인 `style` 사용 허용**:

```tsx
// ✅ 런타임 계산 값
<div style={{ paddingLeft: `${depth * 12}px` }} />

// ❌ 정적인 값에 인라인 style 사용 금지
<div style={{ color: 'red' }} />  // → className="text-red-500"
```

원칙: **정적 값은 Tailwind, 런타임 계산 값만 인라인 style.**

---

## 17. 인증/토큰 정책

- **accessToken**: 메모리 전용 — Zustand `partialize`로 persist 제외 (XSS 노출 방지)
- **refreshToken**: BE에서 httpOnly cookie로 관리, FE 직접 접근 불가
- **새로고침 시 복구**: reissue 엔드포인트로 accessToken 재발급
- **reissue 단일 경로**: `core/http.ts`의 인터셉터에서만 처리. 라우터 가드/컴포넌트에서 raw axios로 reissue 직접 호출 금지
- **401 처리**: reissue 시도 → 실패 시 `clearAuth()` + router navigate로 로그인 화면 이동 (`window.location.href` 직접 사용 금지)
- **요청 ID**: `crypto.randomUUID()` 사용 시 secure context(HTTPS) fallback 필요 — dev http://localhost 외 환경 고려

---

## 18. 분석/추적 정책 (PII)

- **`identify(distinct_id)` 인자**: userId(숫자) 또는 hashed id 사용. **닉네임/이메일 등 PII 직접 사용 금지**
- **로그아웃 시 `posthog.reset()` (또는 동등 호출) 필수** — 다음 사용자와 식별자 섞임 방지
- **Sentry/Faro `setUser`**: 동일 — PII 직접 노출 금지
- **URL 파라미터 캡처 시 토큰/code/state 등 민감 정보 strip** — 특히 OAuth callback URL
- **빈 키로 init 호출 금지**: `if (key) posthog.init(...)` 가드 필수
- **PostHog `capture_pageview: false`** 권장 — 수동 캡처로 sensitive route 제외 가능

---

## 19. 접근성(a11y) 최소 요건

게임 화면(Phaser canvas) 외 모든 모달/폼은 다음을 만족:

- 모달 컨테이너: `role="dialog"`, `aria-modal="true"`, `tabIndex={-1}`
- 모달 헤더에 `aria-labelledby` 연결 (또는 `aria-label`)
- ESC 키 닫기 핸들러
- **모달 열릴 때 컨테이너로 자동 포커스** (`tabIndex={-1}` 부여), 닫힐 때 트리거 요소로 포커스 복귀
  - 첫 focusable 요소로 직행 금지 — 직전 keydown(Enter, Space)의 key-repeat이 포커스 직후 버튼에 흘러들어가 의도치 않은 click을 유발 (예: 영상 스킵 Enter → 모달 첫 버튼 자동 클릭)
  - 사용자는 모달 진입 후 Tab 한 번으로 첫 focusable에 진입. 스크린 리더는 `role`/`aria-labelledby`로 정상 안내
  - ARIA APG dialog 패턴 / Radix Dialog / react-aria 동일 기본 동작
- Tab/Shift+Tab focus trap (모달 외부로 포커스 이탈 방지)
- 폼 input에 `<label htmlFor>` 또는 `aria-label` 부착
- 중첩 모달은 z-index 토큰 체계로 관리 (16장)

게임 화면은 별도 — 키보드 입력 자체가 게임 인터랙션이므로 a11y 요건 면제.

---

## 20. 라우팅 가드 정책 (TanStack Router)

- **인증 가드**: `routes/__root.tsx`의 `beforeLoad`에서 일괄 처리 — 개별 라우트에서 중복 가드 금지
- **search params 검증**: `validateSearch: z.object({...})` 사용
- **path params 검증**: `parseParams` 또는 컴포넌트 진입 시 검증 — 잘못된 값은 `notFound()` 또는 홈 리다이렉트
- **데이터 패칭 위치**:
  - 라우트 진입 전 필요한 데이터: `loader` 사용
  - 인터랙션 기반 데이터: 컴포넌트 hook(useQuery)
  - 두 패턴 혼용 금지 (한 라우트는 한 가지로 통일)
- **lazy 라우트 (`*.lazy.tsx`)**: 진입이 드물거나 chunk가 큰 라우트(게임 화면, 튜토리얼 등)에 적용

---

## 21. MR 템플릿

MR 제목 형식: `[FE/타입/티켓번호] 기능 설명`
예시: `[FE/feat/21] 회원 로그인 기능 구현`

> 템플릿 사용 시 MR 유형의 미체크 항목을 삭제하지 말 것 — 해당하는 항목만 체크(`[x]`)하고 나머지는 그대로 둔다.

```markdown
## 📌 MR 유형

어떤 변경 사항인지 해당하는 항목에 체크해 주세요.

- [ ] feat : 새로운 기능을 추가했습니다.
- [ ] fix : 버그를 수정했습니다.
- [ ] refactor : 기능 변경 없이 코드를 개선했습니다.
- [ ] style : UI 또는 스타일을 수정했습니다.
- [ ] chore : 의존성 추가, 설정 파일 등을 변경했습니다.
- [ ] docs : 문서를 수정했습니다.
- [ ] test : 테스트 코드를 추가하거나 수정했습니다.

---

## 📝 작업 내용

> 이번 MR에서 어떤 작업을 했는지 간략하게 설명해 주세요.

<!-- 예시: 홈 화면 싱글/멀티 모드 선택 버튼 컴포넌트를 구현했습니다. -->

---

## 💡 변경 상세 내용

> 구체적으로 어떤 부분이 어떻게 바뀌었는지 설명해 주세요.
> 코드 스니펫, 다이어그램, 주요 로직 설명 등을 자유롭게 첨부해도 좋습니다.

### Before

<!-- 변경 전 상태를 설명하거나 스크린샷을 첨부해 주세요. -->

### After

<!-- 변경 후 상태를 설명하거나 스크린샷을 첨부해 주세요. -->

---

## 📷 스크린샷 (UI 변경이 있는 경우)

> UI 변경이 없는 PR이라면 이 섹션은 삭제하셔도 됩니다.

| Before | After |
| ------ | ----- |
|        |       |

---

## ✅ 체크리스트

MR을 올리기 전에 아래 항목을 확인해 주세요.

- [ ] 로컬에서 빌드가 정상적으로 완료되었습니다. (`npm run build`)
- [ ] ESLint 및 Prettier 오류가 없습니다.
- [ ] `any` 타입을 사용하지 않았습니다. (TypeScript strict 준수)
- [ ] 인라인 `style={{}}` 을 사용하지 않았습니다. (Tailwind className만 사용)
- [ ] 불필요한 `console.log` 및 디버그 코드를 제거했습니다.
- [ ] `FE` 브랜치로 MR이 설정되어 있습니다. (`develop, master` 브랜치로 설정 금지)
- [ ] MR 제목이 컨벤션 규칙을 따르고 있습니다. (예: `[FE/feat/21] 회원 로그인 기능 구현`)

---

## ⚠️ 리뷰어에게 전달할 내용

> 리뷰어가 특히 주의 깊게 봐주었으면 하는 부분이나,
> 구현하면서 고민했던 부분, 참고해야 할 컨텍스트가 있다면 작성해 주세요.

<!-- 예시: 기존 EventBus 구조를 변경했으니 Phaser 씬 연동 부분을 중점적으로 확인해 주세요. -->
```
