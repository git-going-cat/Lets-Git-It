import { z } from 'zod';

const emailField = z
  .string()
  .email('올바른 이메일 형식이 아닙니다')
  .min(1, '이메일을 입력해주세요');

const passwordField = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .regex(/[A-Za-z]/, '영문자를 포함해야 합니다')
  .regex(/[0-9]/, '숫자를 포함해야 합니다')
  .regex(/[^A-Za-z0-9]/, '특수문자를 포함해야 합니다');

const codeField = z.string().min(1, '인증 코드를 입력해주세요');

/** 회원가입 — 이메일 입력 단계 */
export const signUpEmailSchema = z.object({
  email: emailField,
});

/** 회원가입 — 인증 코드 입력 단계 */
export const signUpVerifySchema = z.object({
  email: emailField,
  code: codeField,
});

/** 회원가입 — 비밀번호 입력 단계 */
export const signUpPasswordSchema = z
  .object({
    password: passwordField,
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  });

/** 비밀번호 찾기 — 이메일 + 인증 코드 단계 */
export const forgotPasswordEmailSchema = z.object({
  email: emailField,
  code: codeField,
});

/** 비밀번호 찾기 — 새 비밀번호 입력 단계 */
export const forgotPasswordResetSchema = z
  .object({
    newPassword: passwordField,
    newPasswordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['newPasswordConfirm'],
  });

export type SignUpEmailValues = z.infer<typeof signUpEmailSchema>;
export type SignUpVerifyValues = z.infer<typeof signUpVerifySchema>;
export type SignUpPasswordValues = z.infer<typeof signUpPasswordSchema>;
export type ForgotPasswordEmailValues = z.infer<typeof forgotPasswordEmailSchema>;
export type ForgotPasswordResetValues = z.infer<typeof forgotPasswordResetSchema>;
