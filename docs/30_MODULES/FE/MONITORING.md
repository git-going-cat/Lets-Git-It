# 모니터링 구성

## 개요

FE 모니터링은 목적이 다른 세 도구로 구성됩니다.

| 도구 | 목적 | 대상 |
|------|------|------|
| **PostHog** | 유저 행동 분석 (게임 funnel, 이탈률) | FE 팀 |
| **Sentry** | JS 에러 수집, Web Vitals | FE 팀 |
| **Grafana Faro** | FE 에러를 BE Grafana로 전송 (로그 연결) | BE 팀 |

---

## 환경변수

`.env` 및 GitLab CI/CD Variables에 아래 항목을 설정합니다.

```env
VITE_PUBLIC_POSTHOG_KEY=    # PostHog 프로젝트 API Key
VITE_PUBLIC_POSTHOG_HOST=   # https://us.i.posthog.com
VITE_SENTRY_DSN=            # Sentry 프로젝트 DSN
VITE_FARO_URL=              # Grafana Alloy 수집 엔드포인트 (BE 팀에서 제공)
```

> `VITE_FARO_URL`이 비어 있으면 Faro는 자동으로 비활성화됩니다.

---

## PostHog

### 초기화
`src/providers/PostHogProvider.tsx` — 앱 최상단에서 초기화, 자동 페이지뷰 추적.  
`src/routes/__root.tsx` — `PostHogPageView`를 Router context 안에서 렌더.

### 수집 이벤트

| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `game_mode_selected` | 홈에서 싱글/멀티 클릭 | `mode: 'single' \| 'multi'` |
| `game_started` | git clone 명령어 입력 성공 | `mode`, `difficulty` |
| `game_completed` | 게임 클리어 | `difficulty`, `score`, `play_time_ms` |
| `game_over` | 목숨 소진 | `difficulty`, `play_time_ms` |
| `game_abandoned` | 일시정지 후 홈으로 이탈 | — |
| `tutorial_step_completed` | 튜토리얼 스텝 해설 확인 | `step`, `total` |
| `tutorial_skipped` | 튜토리얼 스킵 | `at_step` |
| `$pageview` | 라우트 이동 | `$current_url` |

### 유저 식별
- 기존 유저 로그인 시: `posthog.identify(nickname)`
- 신규 유저 닉네임 설정 완료 시: `posthog.identify(nickname)`
- 로그아웃 시: `posthog.reset()` — 디바이스 공유 시 유저 혼용 방지

### analytics wrapper
모든 이벤트 호출은 `src/lib/analytics.ts`를 통해 사용합니다.

```ts
import { analytics } from '@/lib/analytics';

analytics.gameStarted('single', 'EASY');
analytics.gameCompleted('NORMAL', 1500, 120000);
```

---

## Sentry

### 초기화
`src/main.tsx` — 앱 렌더 전에 `Sentry.init()` 호출.

### 수집 항목
- **JS 에러**: 자동 수집 (스택트레이스 포함)
- **Web Vitals**: `browserTracingIntegration`이 LCP · INP · CLS 자동 수집
- **React 렌더 에러**: `Sentry.ErrorBoundary`가 최상단에서 캐치, 게임 스타일 fallback UI 표시

### 동작 조건
`VITE_SENTRY_DSN`이 비어 있으면 자동으로 비활성화됩니다 (`enabled: !!DSN`).

---

## Grafana Faro

### 목적
FE 에러 로그를 BE 팀의 Grafana(Loki)로 전송하여 BE 로그와 같은 화면에서 조회합니다.

### 초기화
`src/lib/faro.ts` — `VITE_FARO_URL`이 설정된 경우에만 초기화.  
`src/main.tsx` — 앱 최상단에서 `import './lib/faro'`로 조기 로드.

### X-Request-Id 연결

모든 API 요청에 `X-Request-Id` 헤더를 자동으로 부착합니다 (`src/core/http.ts`).

```
FE 요청  →  X-Request-Id: <uuid>  →  BE MDC 로그에 동일 값 기록
FE 에러  →  Faro 로그에 request_id 포함  →  Grafana에서 동일 ID로 검색
```

BE가 헤더를 수신하면 해당 값을 MDC에 사용하고, 응답 헤더 `X-Request-Id`로 반환합니다.  
헤더가 없으면 BE가 자체 생성하므로 FE 로그와 연결되지 않습니다.

### 에러 로깅
401 외 API 에러 발생 시 `faro.api.pushError()`로 아래 정보를 전송합니다.

| 필드 | 내용 |
|------|------|
| `request_id` | 해당 요청의 X-Request-Id |
| `url` | 요청 URL |
| `status` | HTTP 상태 코드 |

### BE 팀 전달 사항
- **헤더명**: `X-Request-Id` (HTTP 헤더 대소문자 무관)
- **Faro 엔드포인트**: Grafana Alloy 수집 URL을 `VITE_FARO_URL`에 설정
- **GitLab CI Variables**에 `VITE_FARO_URL` 추가 필요

---

## 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `src/main.tsx` | Sentry init, ErrorBoundary, Faro 조기 로드 |
| `src/lib/analytics.ts` | PostHog 이벤트 wrapper |
| `src/lib/faro.ts` | Faro 초기화 |
| `src/providers/PostHogProvider.tsx` | PostHog 초기화, PHProvider |
| `src/routes/__root.tsx` | PostHogPageView (Router context 내부) |
| `src/core/http.ts` | X-Request-Id 헤더 부착, Faro API 에러 로깅 |
| `src/features/auth/hooks/useAuth.ts` | 로그인/로그아웃 시 PostHog identify/reset |
| `src/features/auth/hooks/useNicknameSetup.ts` | 닉네임 설정 후 PostHog identify |
| `src/features/home/components/ModeSelectSection.tsx` | game_mode_selected 이벤트 |
| `src/features/single/components/StartModal.tsx` | game_started 이벤트 |
| `src/features/single/hooks/useSingleGame.ts` | game_completed, game_over 이벤트 |
| `src/features/single/hooks/usePauseModal.ts` | game_abandoned 이벤트 |
| `src/features/single/hooks/useTutorialMode.ts` | tutorial_step_completed, tutorial_skipped 이벤트 |
