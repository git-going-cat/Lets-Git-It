import { http } from '@/core/http';

import {
  apiResponseSchema,
  loginResponseDataSchema,
  reissueResponseDataSchema,
} from '../types/auth.types';
import type {
  EmailCodePurpose,
  LoginRequest,
  LoginResponseData,
  OAuthTokenRequest,
  RegisterRequest,
  ReissueResponseData,
  ResetPasswordRequest,
  SendEmailCodeRequest,
  SendEmailCodeResponseData,
  VerifyEmailCodeRequest,
} from '../types/auth.types';

/** 로그인 API 응답 Zod 파싱 헬퍼 */
function parseLoginResponse(raw: unknown): { data: { data: LoginResponseData } } {
  const parsed = apiResponseSchema(loginResponseDataSchema).parse(raw);
  return { data: parsed };
}

export const authApi = {
  /** 로컬 이메일/비밀번호 로그인 */
  login: async (body: LoginRequest) => {
    const res = await http.post('/api/v1/auth/login', body);
    return parseLoginResponse(res.data);
  },

  /** Google OAuth 임시코드 → AccessToken 교환 */
  exchangeOAuthCode: async (body: OAuthTokenRequest) => {
    const res = await http.post('/api/v1/auth/token', body);
    return parseLoginResponse(res.data);
  },

  /** AccessToken 재발급 (refreshToken은 HttpOnly 쿠키로 자동 전송) */
  reissue: async (): Promise<{ data: { data: ReissueResponseData } }> => {
    const res = await http.post('/api/v1/auth/reissue');
    const parsed = apiResponseSchema(reissueResponseDataSchema).parse(res.data);
    return { data: parsed };
  },

  /** 로그아웃 */
  logout: () => http.post('/api/v1/auth/logout'),

  // ── 회원가입 / 이메일 인증 / 비밀번호 재설정 ──────────────────────────

  /** 이메일 인증 코드 발송 */
  sendEmailCode: (purpose: EmailCodePurpose, body: SendEmailCodeRequest) =>
    http.post<{ status: number; message: string; data: SendEmailCodeResponseData }>(
      `/api/v1/auth/email/send?purpose=${purpose}`,
      body
    ),

  /** 이메일 인증 코드 검증 */
  verifyEmailCode: (purpose: EmailCodePurpose, body: VerifyEmailCodeRequest) =>
    http.post(`/api/v1/auth/email/verify?purpose=${purpose}`, body),

  /** 회원가입 */
  register: (body: RegisterRequest) => http.post('/api/v1/auth/register', body),

  /** 비밀번호 재설정 */
  resetPassword: (body: ResetPasswordRequest) => http.patch('/api/v1/auth/password/reset', body),
};
