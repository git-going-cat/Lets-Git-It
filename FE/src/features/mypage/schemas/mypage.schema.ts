import { z } from 'zod';

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
  nickname: z.string(),
  authType: z.enum(['LOCAL', 'OAUTH']),
  provider: z.string().nullable(),
  email: z.string(),
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

export const emptyMyPageResponseSchema = z.object({
  status: z.number(),
  message: z.string(),
  data: z.unknown(),
});

export type MyPageRecord = z.infer<typeof myPageRecordSchema>;
export type MyPageResponseData = z.infer<typeof myPageResponseDataSchema>;
