# FE 로그인 & 인증 구현 가이드

> 최초 구현: 2025-04-30 (`feat/FE-149-폴더세팅`)  
> 최종 수정: 2026-05-11 (`feat/FE-225-1차-배포-수정`) — auth/onboarding 치명적 버그 일괄 수정

---

## 1. 구현 범위

| 항목 | 내용 |
|------|------|
| 로컬 로그인 | `POST /api/v1/auth/login` |
| Google OAuth | `GET /api/v1/oauth2/authorization/google` → 리다이렉트 → 코드 교환 |
| 토큰 재발급 | `POST /api/v1/auth/reissue` (자동, 인터셉터) |
| 로그아웃 | `POST /api/v1/auth/logout` |
| 사용자 정보 상태 관리 | Zustand + localStorage persist |

---

## 2. 파일 구조

```
src/
├── router.ts                          # 앱 전역 라우터 인스턴스 (인터셉터 등 React 외부에서 navigate 사용)
│
├── core/
│   └── http.ts                        # axios 인스턴스 + 인터셉터 + reissueToken() 단일 경로
│
├── features/auth/
│   ├── types/
│   │   └── auth.types.ts              # 타입 정의 전체
│   ├── schemas/
│   │   └── response.schema.ts         # Zod 응답 스키마 (reissueResponseDataSchema 등)
│   ├── api/
│   │   └── authApi.ts                 # REST 호출 함수들
│   ├── store/
│   │   └── authStore.ts               # Zustand 전역 상태
│   ├── hooks/
│   │   ├── useAuth.ts                 # 로그인/로그아웃 커스텀 훅
│   │   ├── useOnboarding.ts           # 온보딩 전체 흐름 관리
│   │   ├── useNicknameSetup.ts        # 닉네임 설정 단계
│   │   └── useCountdown.ts            # 인증코드 만료 카운트다운
│   └── components/
│       ├── HomeRedirect.tsx           # 인증 상태에 따른 분기 리다이렉트
│       ├── GoogleCallbackPage.tsx     # /auth/callback/google 처리
│       ├── SignUpModal.tsx            # 회원가입 모달
│       ├── ForgotPasswordModal.tsx    # 비밀번호 찾기 모달
│       ├── ReactivationNotice.tsx     # 계정 복구 알림
│       └── onboarding/
│           ├── OnboardingModal.tsx    # Win11 스타일 온보딩 모달 래퍼
│           └── ...                   # 단계별 온보딩 컴포넌트
│
└── routes/
    ├── __root.tsx                     # 루트 라우트 (인증 가드 + reissue 복구)
    └── ...                            # TanStack Router 파일 기반 라우트
```

---

## 3. 설정 변경 사항

### vite.config.ts
```ts
plugins: [react(), tailwindcss()]   // Tailwind v4 vite 플러그인 추가
resolve.alias: { '@': './src' }     // @ 경로 alias
server.proxy: '/api' → localhost:8080  // BE 프록시
```

### tsconfig.app.json
```json
"paths": { "@/*": ["./src/*"] }
```

### src/index.css
```css
@import 'tailwindcss';
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

@utility font-pixel {
  font-family: 'Press Start 2P', monospace;
}
```

---

## 4. 인증 흐름

### 4-1. 로컬 로그인

```
사용자 입력 (email + password)
    ↓
LoginForm.tsx → useAuth().login()
    ↓
authApi.login() → POST /api/v1/auth/login
    ↓
응답: { accessToken, isFirstLogin, nickname, onboardingStatus, character... }
    ↓
useAuthStore.setAuth(accessToken, AuthUser)
    - accessToken: Zustand 메모리 저장 (localStorage 미포함, XSS 방어)
    - user: localStorage persist (새로고침 대응)
    ↓
isFirstLogin ? navigate('/onboarding') : navigate('/')
```

### 4-2. Google OAuth 로그인

```
Step 1: 사용자가 "구글로 시작하기" 클릭
    ↓
window.location.href = '/api/v1/oauth2/authorization/google'
    ↓ (백엔드가 구글 로그인 처리 후 리다이렉트)
    ↓
Step 2: GET /auth/callback/google?code={임시코드}
    ↓
GoogleCallbackPage.tsx → useAuth().loginWithOAuth(code)
    ↓
authApi.exchangeOAuthCode({ code }) → POST /api/v1/auth/token
    ↓ (이후 흐름은 로컬 로그인과 동일)
```

**엣지 케이스 처리 (2026-05-11 추가):**
- `code`/`error` 모두 없는 직접 URL 진입 → `/login`으로 navigate (무한 spinner 방지)
- 백엔드 OAuth 실패(`error` 파라미터) → `clearAuth()` 후 `/login` navigate
- 코드 만료·무효 → `/login` navigate
- 모든 페이지 이동은 `useNavigate` 사용 (`window.location.href` 사용 금지 — SPA 상태 손실 방지)

### 4-3. 토큰 재발급 (자동)

```
임의의 API 요청 → 401 응답
    ↓
core/http.ts 응답 인터셉터 감지
    ↓
reissueToken() 호출 (core/http.ts 단일 경로)
  - Zod로 응답 스키마 검증 (스키마 불일치 → 즉시 throw, undefined 토큰 저장 방지)
    ↓
성공: 새 accessToken → store 저장 → 원래 요청 재시도
실패: clearAuth() → router.navigate('/login')   ← window.location 사용 금지
```

> **동시 다중 요청 처리:** 재발급 중 발생하는 추가 401은 `pendingQueue`에 쌓아  
> 재발급 완료 후 일괄 재시도합니다.

> **단일 reissue 경로:** `reissueToken()`은 `core/http.ts`에서만 export하며,  
> `routes/__root.tsx`의 새로고침 복구 로직도 이 함수를 import해 사용합니다.  
> 다른 곳에서 raw axios로 reissue를 직접 호출하지 마세요 (race 조건 발생).

### 4-4. 새로고침 후 토큰 복구 (`__root.tsx` beforeLoad)

```
새로고침 → accessToken 메모리에서 소실 (persist 제외)
    ↓
__root.tsx beforeLoad 감지 (accessToken === null && isAuthenticated)
    ↓
reissueToken() 호출 (core/http.ts 단일 경로, 인터셉터와 race 없음)
    ↓
성공: fetchMyAuthUser()로 프로필 동기화 → setAuth()
실패: clearAuth() → redirect('/login')
```

### 4-5. HomeRedirect 분기 순서

```
isAuthenticated === false → /login
pendingReactivationNotice === true → <ReactivationNotice />   ← 온보딩 여부보다 먼저 체크
onboardingStatus !== 'TUTORIAL_DONE' → /onboarding
그 외 → /home
```

> `pendingReactivationNotice` 체크가 `onboardingStatus` 보다 **앞에** 있어야 합니다.  
> 재활성화(isReactivated=true)이면서 온보딩 미완인 케이스에서 ReactivationNotice가 표시되어야 합니다.

### 4-6. 온보딩 완료 처리 (`useOnboarding.finishOnboarding`)

```
completeTutorial() API 호출
    ↓
성공: updateUser({ onboardingStatus: 'TUTORIAL_DONE' }) → navigate('/home')
실패(401): clearAuth() → navigate('/login')   ← 토큰 만료 명시 처리
실패(네트워크, response 없음): throw → 상위 전파
실패(409 등 기타): 무시 → navigate('/home')   ← 이미 완료 상태 등
```

---

## 5. Zustand 상태 구조

```ts
interface AuthState {
  accessToken: string | null        // 메모리 전용 (persist 제외)
  user: AuthUser | null             // localStorage 저장
  isAuthenticated: boolean          // localStorage 저장
  pendingReactivationNotice: boolean // 탈퇴 후 재활성화 알림 표시 여부
  setAuth(token, user): void
  setAccessToken(token): void
  clearAuth(): void
  updateUser(partial): void         // 온보딩 중 닉네임/status 부분 업데이트
  setReactivated(value): void
}
```

| 상태 | 저장 위치 | 이유 |
|------|-----------|------|
| `accessToken` | 메모리 전용 | localStorage 노출 시 XSS 취약, reissue로 복구 가능 |
| `user` | localStorage | 새로고침 후 프로필 데이터 즉시 표시 |
| `isAuthenticated` | localStorage | 페이지 이동 가드 판단용 |
| `pendingReactivationNotice` | localStorage | 탈퇴 후 재가입 시 복구 알림 1회 표시 |

---

## 6. 컴포넌트 구조

### HomeRedirect.tsx

- 인증 상태 + onboardingStatus + pendingReactivationNotice를 조합해 적절한 화면으로 분기
- **분기 순서가 중요:** `pendingReactivationNotice` → `onboardingStatus` → `/home` 순으로 체크

### LoginForm / SignUpModal / ForgotPasswordModal

- `react-hook-form` + `zod` 검증 (`zodResolver`)
- 모든 폼은 `<form onSubmit>` 래핑 필수 — Enter 키 제출 보장 (컨벤션 11장)
- mutation `isPending` 동안 제출 버튼 `disabled`

### GoogleCallbackPage (`features/auth/components/GoogleCallbackPage.tsx`)

- `code` 쿼리 파라미터를 `useSearch()`로 수신
- `useEffect` + `useRef`(중복 호출 방지)로 즉시 토큰 교환
- `code`/`error` 모두 없으면 즉시 `/login` navigate (무한 spinner 방지)
- 모든 이동은 `useNavigate` 사용 (`window.location.href` 사용 금지)

### OnboardingModal (`features/auth/components/onboarding/OnboardingModal.tsx`)

- Win11 스타일 유령 창 레이어 온보딩 래퍼
- 창 닫기 버튼 클릭 시 "작동하지 않습니다" 툴팁 표시
- 타이머는 `useRef`로 관리 → 연속 클릭 시 이전 타이머 취소, 언마운트 cleanup 포함

---

## 7. 라우터 구조 (TanStack Router v1)

```
/                      → HomeRedirect (인증 상태 분기)
/login                 → LandingPage
/auth/callback/google  → GoogleCallbackPage
/onboarding            → 온보딩 흐름 (useOnboarding 훅)
/home                  → 홈 화면
```

> **라우터 인스턴스 (`src/router.ts`):**  
> `createRouter()`를 `App.tsx`와 분리해 별도 모듈로 export합니다.  
> React 컴포넌트 외부(axios 인터셉터 등)에서 `router.navigate()`를 사용하기 위함입니다.  
> `App.tsx`는 이 파일에서 router를 import해 `<RouterProvider>`에 전달합니다.

---

## 8. 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `VITE_API_BASE_URL` | API baseURL | 로컬: `http://localhost:8080` |

> `src/config/env.ts`에서 Zod로 필수 키 검증 — 없으면 앱 부팅 시 즉시 throw

---

## 9. 주요 구현 원칙 (금지 사항)

| 금지 | 대신 사용 |
|------|-----------|
| `window.location.href = '/login'` | `router.navigate({ to: '/login' })` |
| reissue를 raw axios로 직접 호출 | `reissueToken()` (core/http.ts) |
| `catch(() => {})` 전체 silent 무시 | `isAxiosError` 분기 후 에러 종류별 처리 |
| 렌더 중 `ref.current = value` | `useEffect(() => { ref.current = value })` |
| `useEffect` 내 동기 setState 남용 | 파생값(derived state)으로 대체 |

---

## 10. TODO (다음 단계)

- [ ] 이메일 인증코드 만료 시각 BE에서 `+09:00` 오프셋 포함 ISO 8601로 변경 → `useCountdown.ts` 임시 처리 제거 가능
- [ ] 인증 가드 (Protected Route) 추가
- [ ] 세션 초기화 시 reissue 자동 시도 로직 (`App.tsx` 마운트 시)
- [ ] 비밀번호 찾기 페이지
