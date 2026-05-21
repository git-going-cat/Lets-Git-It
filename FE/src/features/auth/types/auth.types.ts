import type { CharacterInfo, OnboardingStatus } from '../schemas/response.schema';

export type {
  CharacterInfo,
  LoginResponseData,
  OnboardingStatus,
  ReissueResponseData,
  SendEmailCodeResponseData,
} from '../schemas/response.schema';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OAuthTokenRequest {
  code: string;
}

export interface AuthUser extends CharacterInfo {
  memberId: string | null;
  nickname: string | null;
  onboardingStatus: OnboardingStatus;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

// ── 이메일 인증 / 회원가입 / 비밀번호 재설정 ───────────────────────────────

export type EmailCodePurpose = 'SIGN_UP' | 'PASSWORD_RESET' | 'WITHDRAW';

export interface SendEmailCodeRequest {
  email: string;
}

export interface VerifyEmailCodeRequest {
  email: string;
  code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}
