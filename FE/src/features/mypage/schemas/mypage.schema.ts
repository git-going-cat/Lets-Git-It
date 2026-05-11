import { z } from 'zod';

import { onboardingStatusSchema } from '@/features/auth/schemas/response.schema';

export const myPageRecordModeSchema = z.enum([
  'SINGLE_EASY',
  'SINGLE_NORMAL',
  'SINGLE_HARD',
  'CONTRIBUTION_RUN',
  'TIME_ATTACK',
  'COOP',
]);

export const myPageRecordSchema = z.object({
  mode: myPageRecordModeSchema,
  bestScore: z.number().optional(),
  totalContribution: z.number().optional(),
  totalCount: z.number().optional(),
  bestClearTime: z.number().optional(),
});

export const myPageResponseDataSchema = z.object({
  nickname: z.string().nullable(),
  authType: z.enum(['LOCAL', 'OAUTH']),
  provider: z.string().nullable(),
  email: z.string(),
  onboardingStatus: onboardingStatusSchema.optional(),
  totalPlayTime: z.number(),
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
  records: z.array(myPageRecordSchema),
});

export const myPageResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: myPageResponseDataSchema,
});

export const myAuthUserResponseDataSchema = z.object({
  memberId: z.string().optional(),
  nickname: z.string().nullable(),
  onboardingStatus: onboardingStatusSchema.optional(),
  characterHair: z.string().optional(),
  characterHairColor: z.string().optional(),
  characterBody: z.string().optional(),
  characterEye: z.string().optional(),
  characterOutfit: z.string().optional(),
  characterOutfitColor: z.string().optional(),
});

export const myAuthUserResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: myAuthUserResponseDataSchema,
});

export const emptyMyPageResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.unknown(),
});

export type MyPageRecord = z.infer<typeof myPageRecordSchema>;
export type MyAuthUserResponseData = z.infer<typeof myAuthUserResponseDataSchema>;
export type MyPageResponseData = z.infer<typeof myPageResponseDataSchema>;
