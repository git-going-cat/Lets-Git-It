import { z } from 'zod';

import { DIFFICULTIES } from '@/shared/types/game.types';

export const commandItemSchema = z.object({
  commandSequence: z.number(),
  text: z.string(),
  branchName: z.string(),
  type: z.enum(['CREATE', 'MERGE', 'SWITCH', 'COMMON', 'CONFLICT']),
});

export const startSessionDataSchema = z.object({
  sessionId: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  bestScore: z.number(),
  commandSet: z.array(commandItemSchema),
});

export const saveResultDataSchema = z.object({
  isNewRecord: z.boolean(),
});

export type StartSessionData = z.infer<typeof startSessionDataSchema>;
