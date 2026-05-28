# 모니터링 구성

## 개요

FE 모니터링은 목적이 다른 세 도구로 구성됩니다.

| 도구 | 목적 | 대상 |
|------|------|------|
| **PostHog** | 유저 행동 분석 (게임 funnel, 이탈률) | FE 팀 |
| **Sentry** | JS 에러 수집, Web Vitals, WS STOMP 에러 경보 | FE 팀 |
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

> - `VITE_FARO_URL`이 비어 있으면 Faro는 자동으로 비활성화됩니다.
> - PostHog는 **`NODE_ENV=production` 빌드에서만 활성화**됩니다. dev 이벤트는 수집하지 않습니다.

---

## PostHog

### 초기화
`src/providers/PostHogProvider.tsx` — `POSTHOG_KEY && MODE === 'production'` 조건 모두 충족 시에만 init.  
`src/routes/__root.tsx` — `PostHogPageView`를 Router context 안에서 렌더.

### 수집 이벤트

#### Single 모드
| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `game_mode_selected` | 홈에서 싱글/멀티 클릭 | `mode: 'single' \| 'multi'` |
| `game_started` | git clone 명령어 입력 성공 | `mode`, `difficulty` |
| `game_completed` | 게임 클리어 | `difficulty`, `score`, `play_time_ms` |
| `game_over` | 목숨 소진 / churu 미달 / 세션 만료 | `difficulty`, `play_time_ms`, `reason: 'GAMEOVER' \| 'ESCAPE_FAILED' \| 'SESSION_EXPIRED'` |
| `game_abandoned` | 일시정지 후 홈으로 이탈 | — |
| `single_game_restarted` | 다시하기 버튼 클릭 | `from: 'pause' \| 'result'`, `difficulty` |
| `tutorial_step_completed` | 튜토리얼 스텝 해설 확인 | `step`, `total` |
| `tutorial_skipped` | 튜토리얼 스킵 | `at_step` |
| `$pageview` | 라우트 이동 | `$current_url` |

#### Multi — 방 입장 funnel
| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `multi_room_created` | 방 생성 성공 | `mode`, `roomId`, `hasPassword`, `maxPlayers?`, `selectedMapId?` |
| `multi_room_joined` | 방 입장 성공 | `mode`, `roomId`, `via: 'list' \| 'code' \| 'create'`, `hasPassword` |
| `multi_waiting_room_entered` | 대기실 마운트 | `mode`, `room_id` |
| `multi_game_start_clicked` | 방장이 게임 시작 클릭 | `mode`, `roomId`, `memberCount` |
| `multi_room_left` | 대기실 이탈 | `mode`, `roomId`, `trigger: 'manual' \| 'kicked' \| 'force_disconnect'` |

#### Contribution 게임 funnel
| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `contribution_game_started` | 카운트다운 종료 후 게임 시작 | `roomId`, `sessionId`, `playerCount` |
| `contribution_game_ended` | 결과 모달 최초 표시 | `roomId`, `sessionId`, `isSuccess`, `myRank`, `rankingsCount`, `reason` |
| `contribution_game_exited` | 결과 모달 또는 게임 중 이탈 | `roomId`, `via: 'home' \| 'back_to_room' \| 'kicked' \| 'force_disconnect'` |

#### Coop 게임 funnel
| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `coop_game_started` | 라운드 1 reveal 수신 시 1회 | `roomId`, `sessionId`, `playerCount`, `mapName` |
| `coop_game_ended` | 게임 종료 | `roomId`, `sessionId`, `isSuccess`, `reason`, `elapsedTimeMs`, `hasNewRecord`, `totalTypoCount`, `totalResetCount` |
| `coop_order_reset` | 순서 오류로 리셋 발생 | `roomId`, `sessionId`, `round`, `isMe` |

#### Incident (장애 대응) funnel
| 이벤트 | 발생 시점 | 주요 프로퍼티 |
|--------|-----------|---------------|
| `incident_scenario_started` | 인트로 완료 후 게임 시작 | `scenarioId`, `scenarioTitle`, `cardCount` |
| `incident_scenario_completed` | 마지막 카드 완료 | `scenarioId`, `scenarioTitle`, `cardCount`, `totalScore`, `maxScore`, `durationMs` |
| `incident_scenario_abandoned` | 결과 모달 표시 전 나가기 | `scenarioId`, `scenarioTitle`, `currentCardIndex`, `cardCount`, `durationMs` |

### 유저 식별
- 기존 유저 로그인 시: `posthog.identify(memberId)`
- 신규 유저 닉네임 설정 완료 시: `posthog.identify(memberId)`
- 로그아웃 시: `posthog.reset()` — 디바이스 공유 시 유저 혼용 방지

### analytics wrapper
모든 PostHog 이벤트 호출은 `src/lib/analytics.ts`를 통해 사용합니다.  
WS 끊김 이벤트(`reportWsDisconnect`)는 PostHog가 아닌 Faro + Sentry로 전송합니다.

```ts
import { analytics } from '@/lib/analytics';

analytics.gameStarted('single', 'EASY');
analytics.gameCompleted('NORMAL', 1500, 120000);
analytics.coopGameStarted({ roomId: 1, sessionId: 'abc', playerCount: 4, mapName: '기초편' });
```

---

## Sentry

### 초기화
`src/main.tsx` — 앱 렌더 전에 `Sentry.init()` 호출.

### 수집 항목
- **JS 에러**: 자동 수집 (스택트레이스 포함)
- **Web Vitals**: `browserTracingIntegration`이 LCP · INP · CLS 자동 수집
- **React 렌더 에러**: `Sentry.ErrorBoundary`가 최상단에서 캐치, 게임 스타일 fallback UI 표시
- **WS STOMP 에러**: `analytics.reportWsDisconnect({ kind: 'stomp_error' })` 호출 시 `warning` 레벨로 전송

> TCP 연결 끊김(`tcp_close`)과 서버 강제 해제(`force_disconnect`)는 Sentry로 전송하지 않습니다 — Faro 전용.

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

#### API 에러 (자동)
401 외 API 에러 발생 시 `faro.api.pushError()`로 아래 정보를 전송합니다.

| 필드 | 내용 |
|------|------|
| `request_id` | 해당 요청의 X-Request-Id |
| `url` | 요청 URL |
| `status` | HTTP 상태 코드 |

#### WS 끊김 (명시적)
`analytics.reportWsDisconnect()` 호출 시 Faro에 전송됩니다.

| 필드 | 내용 |
|------|------|
| `kind` | `tcp_close` / `stomp_error` / `force_disconnect` |
| `code` | 서버가 내려준 에러 코드 (있을 경우) |
| `route` | 발생 시점 pathname |
| `feature` | 어느 도메인에서 발생했는지 (`multi`, `contribution` 등) |
| `room_id` | 도메인 훅에서 enrichment된 경우 |

WS 끊김은 3단계 레이어에서 수집됩니다.

| 레이어 | 위치 | kind |
|--------|------|------|
| 소켓 레이어 (raw) | `SocketManager.ts` | `tcp_close`, `stomp_error` |
| 대기실 레이어 (enriched) | `useRoomSocket.ts` | `force_disconnect` + `feature=multi` + `roomId` |

### BE 팀 전달 사항
- **헤더명**: `X-Request-Id` (HTTP 헤더 대소문자 무관)
- **Faro 엔드포인트**: Grafana Alloy 수집 URL을 `VITE_FARO_URL`에 설정
- **GitLab CI Variables**에 `VITE_FARO_URL` 추가 필요

---

## 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `src/main.tsx` | Sentry init, ErrorBoundary, Faro 조기 로드 |
| `src/lib/analytics.ts` | PostHog 이벤트 wrapper + WS 끊김 Faro/Sentry 헬퍼 |
| `src/lib/faro.ts` | Faro 초기화 |
| `src/providers/PostHogProvider.tsx` | PostHog 초기화 (production 전용), PHProvider |
| `src/routes/__root.tsx` | PostHogPageView (Router context 내부) |
| `src/core/http.ts` | X-Request-Id 헤더 부착, Faro API 에러 로깅 |
| `src/core/socket/SocketManager.ts` | WS tcp_close / stomp_error 끊김 감지 |
| `src/features/auth/hooks/useAuth.ts` | 로그인/로그아웃 시 PostHog identify/reset |
| `src/features/auth/hooks/useNicknameSetup.ts` | 닉네임 설정 후 PostHog identify |
| `src/features/home/components/ModeSelectSection.tsx` | `game_mode_selected` |
| `src/features/single/components/StartModal.tsx` | `game_started` |
| `src/features/single/hooks/useGameLifecycle.ts` | `game_completed`, `game_over` (reason 포함) |
| `src/features/single/hooks/usePauseModal.ts` | `game_abandoned`, `single_game_restarted` (from: pause) |
| `src/features/single/hooks/useResultModal.ts` | `single_game_restarted` (from: result) |
| `src/features/single/hooks/useTutorialMode.ts` | `tutorial_step_completed`, `tutorial_skipped` |
| `src/features/multi/components/modals/CreateRoomModal.tsx` | `multi_room_created` |
| `src/features/multi/components/LobbyPage.tsx` | `multi_room_joined` (list / code) |
| `src/features/multi/components/WaitingRoom.tsx` | `multi_waiting_room_entered`, `multi_game_start_clicked`, `multi_room_left` |
| `src/features/multi/hooks/useRoomSocket.ts` | `force_disconnect` WS enrichment |
| `src/features/contribution/hooks/useContributionGame.ts` | `contribution_game_started` |
| `src/features/contribution/hooks/useResultModal.ts` | `contribution_game_ended`, `contribution_game_exited` |
| `src/features/contribution/components/ContributionGameContent.tsx` | `contribution_game_exited` (kicked / force_disconnect) |
| `src/features/coop/hooks/useCoopGame.ts` | `coop_game_started`, `coop_game_ended`, `coop_order_reset` |
| `src/features/incident/components/IncidentGame.tsx` | `incident_scenario_started`, `incident_scenario_completed`, `incident_scenario_abandoned` |
