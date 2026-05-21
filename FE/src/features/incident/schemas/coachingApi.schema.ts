import { z } from 'zod';

export const coachingResponseSchema = z.object({
  coaching: z.string(),
  modelUsed: z.string(),
  latencyMs: z.number(),
  sourceChunks: z.array(
    z.object({
      chapter: z.string(),
      section: z.string(),
      text: z.string(),
    })
  ),
  cached: z.boolean(),
});

export type CoachingResponse = z.infer<typeof coachingResponseSchema>;
