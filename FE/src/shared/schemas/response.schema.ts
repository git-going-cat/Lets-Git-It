import { z } from 'zod';

/** API 공통 응답 래퍼 스키마 팩토리 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.number(),
    message: z.string(),
    data: dataSchema,
  });
