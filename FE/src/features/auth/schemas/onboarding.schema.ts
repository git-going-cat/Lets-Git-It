import { z } from 'zod';

import { apiResponseSchema } from '@/shared/schemas/response.schema';

import type { TutorialCommand, TutorialStep } from '@/shared/types/tutorial.types';

export {
  nicknameFormSchema,
  type NicknameFormValues,
  nicknameSchema,
} from '@/shared/schemas/nickname.schema';

export const characterFormSchema = z.object({
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
});
export type CharacterFormValues = z.infer<typeof characterFormSchema>;

export const tutorialCommandSchema: z.ZodType<TutorialCommand> = z.object({
  sequence: z.number(),
  command: z.string(),
  explanation: z.string(),
});

export const tutorialStepSchema: z.ZodType<TutorialStep> = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  commands: z.array(tutorialCommandSchema),
});

export const tutorialResponseSchema = apiResponseSchema(
  z.object({ steps: z.array(tutorialStepSchema) })
);

export type { TutorialCommand, TutorialStep };
