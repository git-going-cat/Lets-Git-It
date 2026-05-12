import { z } from 'zod';

import { nicknameFormSchema } from '@/shared/schemas/nickname.schema';

export const editNicknameSchema = nicknameFormSchema;

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
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
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.',
    path: ['newPassword'],
  });

export type EditNicknameForm = z.infer<typeof editNicknameSchema>;
export type VerifyPasswordForm = z.infer<typeof verifyPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
