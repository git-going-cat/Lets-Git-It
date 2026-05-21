import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_WS_URL: z.string().url(),
  VITE_BOARD_SURVEY_URL: z.string().url(),
  VITE_PUBLIC_POSTHOG_KEY: z.string().default(''),
  VITE_PUBLIC_POSTHOG_HOST: z.string().default(''),
  VITE_SENTRY_DSN: z.string().default(''),
  VITE_FARO_URL: z.string().default(''),
  VITE_AI_API_URL: z.string().default(''),
  VITE_AI_API_KEY: z.string().default(''),
  MODE: z.string(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const errors = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
    .join('\n');
  throw new Error(
    `[env] 환경변수 검증 실패. .env.example을 참고해 .env 파일을 채워주세요.\n${errors}`
  );
}

const data = parsed.data;

/**
 * 검증된 환경변수.
 *
 * - 필수(누락/형식 오류 시 앱 시작 실패): `API_BASE_URL`, `WS_URL`, `BOARD_SURVEY_URL`
 * - 선택(빈 문자열 허용, 호출 측에서 truthy 가드 후 사용): `POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN`, `FARO_URL`, `AI_API_URL`, `AI_API_KEY`
 * - `import.meta.env` 직접 접근 금지 — 본 모듈만 경유 (컨벤션 12장)
 */
export const env = {
  API_BASE_URL: data.VITE_API_BASE_URL,
  WS_URL: data.VITE_WS_URL,
  BOARD_SURVEY_URL: data.VITE_BOARD_SURVEY_URL,
  POSTHOG_KEY: data.VITE_PUBLIC_POSTHOG_KEY,
  POSTHOG_HOST: data.VITE_PUBLIC_POSTHOG_HOST,
  SENTRY_DSN: data.VITE_SENTRY_DSN,
  FARO_URL: data.VITE_FARO_URL,
  AI_API_URL: data.VITE_AI_API_URL,
  AI_API_KEY: data.VITE_AI_API_KEY,
  MODE: data.MODE,
} as const;
