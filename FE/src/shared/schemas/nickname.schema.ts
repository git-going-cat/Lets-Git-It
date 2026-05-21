import { z } from 'zod';

export const NICKNAME_DUPLICATE_ERROR_CODE = 'NICKNAME_DUPLICATE';

export const NICKNAME_RULE = {
  minLength: 2,
  maxLength: 6,
  allowedPattern: /^[\uAC00-\uD7A3A-Za-z0-9]+$/,
  jamoOnlyPattern: /^[\u3131-\u318E]+$/,
  messages: {
    min: '닉네임은 2자 이상이어야 합니다.',
    max: '닉네임은 6자 이하여야 합니다.',
    pattern: '한글, 영문, 숫자만 사용할 수 있습니다.',
    jamoOnly: '초성 또는 모음만으로 구성된 닉네임은 사용할 수 없습니다.',
    duplicate: '이미 사용 중인 닉네임입니다.',
    checkFailed: '닉네임 중복 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    saveFailed: '닉네임 저장에 실패했습니다.',
  },
} as const;

export const nicknameSchema = z
  .string()
  .min(NICKNAME_RULE.minLength, NICKNAME_RULE.messages.min)
  .max(NICKNAME_RULE.maxLength, NICKNAME_RULE.messages.max)
  .regex(NICKNAME_RULE.allowedPattern, NICKNAME_RULE.messages.pattern)
  .refine((value) => !NICKNAME_RULE.jamoOnlyPattern.test(value), NICKNAME_RULE.messages.jamoOnly);

export const nicknameFormSchema = z.object({ nickname: nicknameSchema });

export type NicknameFormValues = z.infer<typeof nicknameFormSchema>;
