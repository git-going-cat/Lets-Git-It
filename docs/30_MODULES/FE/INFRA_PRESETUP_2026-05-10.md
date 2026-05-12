# 공용 인프라 선처리 트랙 (2026-05-10)

## Background / Context

`docs/30_MODULES/FE/REVIEW_2026-05-10.md` 작성 후, 팀원 3명(안수연/전은진/이유정) 에게 리뷰 문서를 배포하기 *전* 에 공용 인프라 / 다른 작업의 전제조건 항목을 일괄 처리할 필요성이 도출됨.

해결하려는 문제:

- 컨벤션이 *글로만* 명시되고 코드에는 미반영
  - 11장 (`throwOnError: false`, `retry: 1`)
  - 12장 (env Zod 검증, `import.meta.env` 직접 접근 금지)
  - 18장 (PostHog 빈 키 init 가드)
  - 19장 (모달 a11y 최소 요건)
- REST API `.parse()` 다수 호출 중인데 안전망 미설정
  - `mypageApi.ts` 6곳, `useCurrentCharacterAsset.ts` 1곳, 기타
  - 컨벤션 3장의 `.parse()` 허용 정책의 *전제 조건* 이 충족되지 않은 상태
- env 누락 시 silent `undefined` 사고 가능
  - `as string` 단언만 있어 `axios.baseURL = undefined` 로 모든 요청이 같은 origin 으로 가는 케이스 위험
- 모달 a11y 골격 부재
  - 각 도메인 담당자가 따로따로 구현하면 일관성 깨짐
  - 한 번에 골격을 마련하면 자기 영역 작업 시 *사용* 만 하면 됨

전제: 사용자(프로젝트 리드) 가 팀원 작업 *전* 에 공용 골격을 일괄 정착 → 팀원이 의존하는 안전망/스켈레톤이 미리 깔린 상태에서 도메인 작업 시작.

---

## Decision

총 4 commit 으로 분리. 한 커밋씩 검토 가능하도록 주제 단위로 쪼갬.

### Commit 1 — `App.tsx` QueryClient 전역 옵션

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      throwOnError: false,
    },
  },
});
```

- 컨벤션 11장 명시 사항 정착
- `retry: 1`: v5 기본 3회 → 4회 호출 + Sentry/Faro 4건 로그 폭주. 1회 retry 로 단발성 회복은 유지하면서 폭주 방지
- `throwOnError: false`: v5 기본값과 동일하나 *명시화* — 향후 누군가 `true` 로 바꾸면 PR 리뷰에서 잡힘
- mutations: 기본 0 유지 (side-effect 재시도 위험 회피)

### Commit 2 — 모달 a11y 골격 + PixelModal 공백 fix

검토한 대안:

- **A. 첫 focusable 자동 포커스** — ARIA APG dialog 예제의 한 갈래
- **B. 컨테이너 자동 포커스** — Radix Dialog / react-aria 기본 동작 — *채택*

채택 사유 (실전 사고 발견):

A 로 처음 구현 → 게임 종료 영상 스킵 Enter 의 keydown key-repeat 이 모달 마운트 직후 다시하기 버튼에 흘러 *의도치 않은 자동 클릭(즉시 재시작)* 발생. B 로 변경 → 사용자는 Tab 한 번으로 첫 focusable 진입, key-repeat 사고 0. 컨벤션 19장도 사례까지 함께 명문화.

non-breaking 보장:

- `useModal` 호출처 9곳 모두 반환값(`{ containerRef }`) 미사용 상태로 그대로 둠
- 대상: `RankingModal`, `EditProfileModal`, `MyPageModal`, `EditCharacterModal`, `AccountConfirmModal`, `DictionaryModal`, `ChangePasswordModal`, `Win11ExplorerModal`, `SettingsModal`, `PauseModal`
- a11y 골격 미적용으로 남되 *기존 동작(ESC + body scroll lock) 은 그대로 유지*
- 각 도메인 담당자가 자기 영역에서 차차 마이그레이션 (REVIEW 문서에 도메인 공통 항목으로 명시됨)

### Commit 3 — `env.ts` Zod 검증 + 키 확장

```ts
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_WS_URL: z.string().url(),
  VITE_BOARD_SURVEY_URL: z.string().url(),
  VITE_PUBLIC_POSTHOG_KEY: z.string().default(''),
  VITE_PUBLIC_POSTHOG_HOST: z.string().default(''),
  VITE_SENTRY_DSN: z.string().default(''),
  VITE_FARO_URL: z.string().default(''),
  MODE: z.string(),
});
```

검토한 대안:

- 수동 if 검증 — 보일러플레이트, 타입 추론 약함
- `valibot` / `arktype` (Zod 대안) — 기능 동등하나 우리가 이미 BE 응답 검증에 Zod 사용 중. 추가 비용 0, 익숙함 유지 → Zod 채택

키 분류:

- 필수 (`API_BASE_URL`, `WS_URL`, `BOARD_SURVEY_URL`): `.url()` — 누락/형식 오류 시 앱 시작 단계 throw (12장 fail-fast)
- 선택 (분석/모니터링): `.default('')` — 빈 문자열 허용, 호출 측 truthy 가드
- `MODE`: `z.string()` — Vite 가 항상 주입

검증 실패 시 사람이 읽을 수 있는 메시지로 throw — 어떤 키가 왜 실패했는지 노출.

### Commit 4 — `import.meta.env` 일괄 이전 + PostHog 빈 키 가드

- `main.tsx`, `lib/faro.ts`, `providers/PostHogProvider.tsx` 의 모든 `import.meta.env.VITE_*` 직접 접근 → `env.*` 로 일괄 교체
- `PostHogProvider`: `if (env.POSTHOG_KEY) posthog.init(...)` 가드 (18장 강제) — 빈 키 init 시 *"PostHog was initialized without a token"* 콘솔 misconfiguration 경고가 사라짐

검증:

```bash
grep -rn "import.meta.env" FE/src/
# → config/env.ts 한 곳만 (safeParse 호출 + JSDoc) — 의도대로
```

---

## Troubleshooting / 사전 인지 사항

본 MR 머지 후에도 콘솔에 보일 수 있는 에러들. 모두 *infra/server* 측 이슈로 본 MR 무관.

### 운영 환경 `lets-git-it.kr/faro/collect` 502 Bad Gateway

- 의미: nginx/reverse-proxy 까지는 살아있으나 Faro 수집 서비스 자체가 다운 또는 라우팅 broken
- FE 영향: 없음 (백그라운드 모니터링 fail 은 UX 무관). 콘솔 노이즈만
- 조치 필요: BE/INFRA — Faro 컨테이너 헬스체크, nginx upstream 설정 점검

### `api-dev.lets-git-it.kr` PostHog 401 Unauthorized

- 의미: 자체 프록시 게이트웨이가 PostHog SDK 의 요청 차단
- FE 영향: 없음. 콘솔 노이즈만
- 조치 필요: BE/INFRA — `/array/*`, `/decide`, `/e/*`, `/flags/*` 경로 게이트웨이 통과 설정

### Dev 의 Faro CORS 차단

- 원인: Faro receiver 의 `Access-Control-Allow-Origin` 에 `http://localhost:5173` 미포함
- 임시 회피: 로컬 `.env` 의 `VITE_FARO_URL=` 빈값 → `lib/faro.ts` 의 truthy 가드로 init skip
- 항구 조치: 인프라 — CORS 설정 추가

### 로컬 dev 의 `/api/v1/auth/reissue` 타임아웃 (~2분)

- 원인: `routes/__root.tsx:39-46` 의 raw axios reissue + BE 무응답 시 axios 기본 timeout 약 2분 hang
- 본 MR 무관 — 전은진 *우선처리 2번* (`core/http.ts` reissue 단일 경로 통합) 에서 처리 예정
- 임시 회피: 로컬 dev 시 BE 닿지 않으면 `localStorage` 비우고 `/login` 직행 후 정상 로그인

---

## 영향 범위 (각 담당자별)

- **모든 도메인** — REST API `.parse()` 사용 시 throw 가 React Query `error` 상태로 안전 캡처. 컨벤션 3장(`.parse()` 허용) 안심 적용 가능
- **모달 보유 도메인 (전은진/이유정)** — `useModal()` 반환 `containerRef` 를 모달 컨테이너에 부착 + `role`/`aria-modal`/`aria-labelledby` 직접 부여 패턴으로 마이그레이션. 참고 예시 `shared/components/PixelModal.tsx`
- **single 도메인 (안수연)** — `StartModal`, `TutorialPauseModal`, `TutorialCompleteModal` 은 `useModal` 미사용 자체 모달이라 별도 a11y 마이그레이션 필요
- **환경변수 신규 사용 시 (모든 도메인)** — `import.meta.env` 직접 접근 금지, `import { env } from '@/config/env'` 만 사용. 새 키 추가 시 `config/env.ts` 의 `envSchema` 부터 갱신

---

## 후속 작업

- 본 MR 머지 후 팀원 3명에게 `docs/30_MODULES/FE/REVIEW_2026-05-10.md` 배포
- 우선순위 순서는 REVIEW 문서 하단의 "우선 처리 권장 순서" 참고
