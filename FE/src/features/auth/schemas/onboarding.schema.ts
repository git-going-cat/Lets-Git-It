import { z } from 'zod';

import { apiResponseSchema } from './response.schema';

// ── 닉네임 ────────────────────────────────────────────────────────────────────

/**
 * 닉네임 정책
 * - 2~6자, 영문+한글+숫자
 * - 초성/모음만으로 구성 금지
 * - 특수문자 금지
 */
export const nicknameSchema = z
  .string()
  .min(2, '닉네임은 2자 이상이어야 합니다')
  .max(6, '닉네임은 6자 이하이어야 합니다')
  .regex(/^[가-힣A-Za-z0-9]+$/, '영문, 한글, 숫자만 사용할 수 있습니다')
  .refine(
    (v) => !/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(v),
    '초성 또는 모음만으로 구성된 닉네임은 사용할 수 없습니다'
  );

export const nicknameFormSchema = z.object({ nickname: nicknameSchema });
export type NicknameFormValues = z.infer<typeof nicknameFormSchema>;

// ── 캐릭터 ────────────────────────────────────────────────────────────────────

export const characterFormSchema = z.object({
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
});
export type CharacterFormValues = z.infer<typeof characterFormSchema>;

// ── 튜토리얼 응답 ─────────────────────────────────────────────────────────────

export const tutorialCommandSchema = z.object({
  sequence: z.number(),
  command: z.string(),
  explanation: z.string(),
});

export const tutorialStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  commands: z.array(tutorialCommandSchema),
});

export const tutorialResponseSchema = apiResponseSchema(
  z.object({ steps: z.array(tutorialStepSchema) })
);

export type TutorialStep = z.infer<typeof tutorialStepSchema>;
export type TutorialCommand = z.infer<typeof tutorialCommandSchema>;
