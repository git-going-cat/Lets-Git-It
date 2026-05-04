import { z } from 'zod';

// ── Zod 스키마 ─────────────────────────────────────────────────────────────

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
  accessToken: z.string(),
  isFirstLogin: z.boolean(),
  nickname: z.string().nullable(),
  onboardingStatus: onboardingStatusSchema,
});

export const reissueResponseDataSchema = z.object({
  accessToken: z.string(),
});

/** API 공통 래퍼 스키마 팩토리 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.number(),
    message: z.string(),
    data: dataSchema,
  });

// ── 파생 TS 타입 ────────────────────────────────────────────────────────────

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type CharacterInfo = z.infer<typeof characterInfoSchema>;
export type LoginResponseData = z.infer<typeof loginResponseDataSchema>;
export type ReissueResponseData = z.infer<typeof reissueResponseDataSchema>;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OAuthTokenRequest {
  code: string;
}

export interface AuthUser extends CharacterInfo {
  nickname: string | null;
  onboardingStatus: OnboardingStatus;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}
