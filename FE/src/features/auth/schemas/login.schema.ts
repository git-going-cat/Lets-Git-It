import { z } from 'zod';

/**
 * 로그인 폼 유효성 검증 스키마 (React Hook Form + Zod resolver).
 *
 * - `email`: 이메일 형식 필수
 * - `password`: 1자 이상 필수
 */
export const loginSchema = z.object({
  email: z.email('올바른 이메일 형식이 아닙니다').min(1, '이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
