// 경로 문자열 직접 사용 금지 — 반드시 이 파일에서 import
export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  GOOGLE_CALLBACK: '/auth/callback/google',
  ONBOARDING: '/onboarding',
  SINGLE: '/single',
  MULTI: '/multi',
  RANKING: '/ranking',
  DICTIONARY: '/dictionary',
  MYPAGE: '/mypage',
} as const;
