# FE 로그인 & 인증 구현 가이드

> 구현 날짜: 2025-04-30  
> 브랜치: `feat/FE-149-폴더세팅`

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
├── core/
│   └── http.ts                        # axios 인스턴스 + 인터셉터
│
├── features/auth/
│   ├── types/
│   │   └── auth.types.ts              # 타입 정의 전체
│   ├── api/
│   │   └── authApi.ts                 # REST 호출 함수들
│   ├── store/
│   │   └── authStore.ts               # Zustand 전역 상태
│   ├── hooks/
│   │   └── useAuth.ts                 # 로그인/로그아웃 커스텀 훅
│   └── components/
│       └── LoginForm.tsx              # 로그인 폼 UI
│
├── pages/
│   ├── landing/index.tsx              # 로그인 페이지 (/)  또는 (/login)
│   └── auth/
│       └── GoogleCallback.tsx         # /auth/callback/google
│
└── routes/
    ├── paths.ts                       # 경로 상수
    └── index.tsx                      # TanStack Router 설정
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
GoogleCallback.tsx → useAuth().loginWithOAuth(code)
    ↓
authApi.exchangeOAuthCode({ code }) → POST /api/v1/auth/token
    ↓ (이후 흐름은 로컬 로그인과 동일)
```

### 4-3. 토큰 재발급 (자동)

```
임의의 API 요청 → 401 응답
    ↓
core/http.ts 응답 인터셉터 감지
    ↓
POST /api/v1/auth/reissue (HttpOnly refreshToken 쿠키 자동 포함)
    ↓
성공: 새 accessToken → store 저장 → 원래 요청 재시도
실패: clearAuth() → window.location = '/login'
```

> **동시 다중 요청 처리:** 재발급 중 발생하는 추가 401은 `pendingQueue` 에 쌓아  
> 재발급 완료 후 일괄 재시도합니다.

---

## 5. Zustand 상태 구조

```ts
interface AuthState {
  accessToken: string | null   // 메모리 전용 (persist 제외)
  user: AuthUser | null        // localStorage 저장
  isAuthenticated: boolean     // localStorage 저장
  setAuth(token, user): void
  setAccessToken(token): void
  clearAuth(): void
}
```

| 상태 | 저장 위치 | 이유 |
|------|-----------|------|
| `accessToken` | 메모리 전용 | localStorage 노출 시 XSS 취약, reissue로 복구 가능 |
| `user` | localStorage | 새로고침 후 프로필 데이터 유지 |
| `isAuthenticated` | localStorage | 페이지 이동 가드 판단용 |

---

## 6. 컴포넌트 구조

### LoginForm.tsx

- `react-hook-form` + `zod` 검증
- 이메일 / 비밀번호 입력 → `>` 버튼으로 제출
- API 오류시 인라인 메시지 표시
- "구글로 시작하기" → `window.location.href` 리다이렉트

### LandingPage (pages/landing/index.tsx)

- 픽셀 아트 배경 (CSS gradient + CSS 구름)
- "Let's Git it" 픽셀 폰트 로고
- `LoginForm` 임베드
- 좌하단 픽셀 캐릭터 SVG

### GoogleCallbackPage (pages/auth/GoogleCallback.tsx)

- `code` 쿼리 파라미터를 `useSearch()`로 수신
- `useEffect` + `useRef`(중복 호출 방지)로 즉시 토큰 교환
- 코드 만료/오류 시 `/login` 복귀

---

## 7. 라우터 구조 (TanStack Router v1)

```
/          → HomeRedirect (미인증 시 /login 리다이렉트)
/login     → LandingPage
/auth/callback/google → GoogleCallbackPage
/onboarding → 온보딩 (TODO: 구현 예정)
```

---

## 8. 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| (없음) | API baseURL은 vite proxy 사용 | `/api` → `localhost:8080` |

> 배포 환경에서는 `nginx.conf` 또는 `VITE_API_URL` 환경변수로 설정 예정

---

## 9. TODO (다음 단계)

- [ ] 회원가입 흐름 구현 (`SignupForm.tsx`)
- [ ] 온보딩 화면 구현 (닉네임 설정 → 튜토리얼)
- [ ] 인증 가드 (Protected Route) 추가
- [ ] 세션 초기화 시 reissue 자동 시도 로직 (`App.tsx` 마운트 시)
- [ ] 비밀번호 찾기 페이지
