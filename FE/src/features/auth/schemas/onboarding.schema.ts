import { z } from 'zod';

export {
  nicknameFormSchema,
  type NicknameFormValues,
  nicknameSchema,
} from '@/shared/schemas/nickname.schema';

import { apiResponseSchema } from './response.schema';

export const characterFormSchema = z.object({
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
});
export type CharacterFormValues = z.infer<typeof characterFormSchema>;

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
