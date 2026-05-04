import { http } from '@/core/http';

import {
  apiResponseSchema,
  loginResponseDataSchema,
  reissueResponseDataSchema,
} from '../types/auth.types';
import type {
  LoginRequest,
  LoginResponseData,
  OAuthTokenRequest,
  ReissueResponseData,
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
};
