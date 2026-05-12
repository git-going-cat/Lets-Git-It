import { z } from 'zod';

// ── 공통 API 래퍼 ────────────────────────────────────────────────────────────

/** API 공통 응답 래퍼 스키마 팩토리 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.number(),
    message: z.string(),
    data: dataSchema,
  });

// ── 인증 응답 스키마 ──────────────────────────────────────────────────────────

export const onboardingStatusSchema = z.enum(['NONE', 'NICKNAME_SET_DONE', 'TUTORIAL_DONE']);

export const characterInfoSchema = z.object({
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
});

export const loginResponseDataSchema = characterInfoSchema.extend({
  memberId: z.string(),
  accessToken: z.string(),
  isFirstLogin: z.boolean(),
  /** 탈퇴 후 30일 이내 재가입으로 기존 계정이 복구된 경우 true */
  isReactivated: z.boolean().default(false),
  nickname: z.string().nullable(),
  onboardingStatus: onboardingStatusSchema,
});

export const reissueResponseDataSchema = z.object({
  accessToken: z.string(),
});

export const sendEmailCodeResponseDataSchema = z.object({
  expiredAt: z.string(),
});

/** data 없이 status/message만 반환하는 엔드포인트용 */
export const emptyResponseSchema = apiResponseSchema(z.unknown());

// ── 파생 타입 ────────────────────────────────────────────────────────────────

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type CharacterInfo = z.infer<typeof characterInfoSchema>;
export type LoginResponseData = z.infer<typeof loginResponseDataSchema>;
export type ReissueResponseData = z.infer<typeof reissueResponseDataSchema>;
export type SendEmailCodeResponseData = z.infer<typeof sendEmailCodeResponseDataSchema>;
