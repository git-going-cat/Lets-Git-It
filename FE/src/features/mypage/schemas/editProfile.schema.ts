import { z } from 'zod';

import { nicknameFormSchema } from '@/shared/schemas/nickname.schema';

export const editNicknameSchema = nicknameFormSchema;

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/,
        '영문, 숫자, 특수문자를 모두 포함해야 합니다.'
      ),
    confirmPassword: z.string().min(1, '새 비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

export type EditNicknameForm = z.infer<typeof editNicknameSchema>;
export type VerifyPasswordForm = z.infer<typeof verifyPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
