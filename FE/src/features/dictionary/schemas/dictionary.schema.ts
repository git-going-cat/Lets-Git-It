import { z } from 'zod';

export const commandOptionSchema = z.object({
  option: z.string(),
  description: z.string(),
});

export const commandSchema = z.object({
  commandId: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? ''),
  isInGame: z.boolean(),
  options: z
    .array(commandOptionSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
});

export const dictionaryResponseSchema = z.object({
  commands: z.array(commandSchema),
});
