import { z } from 'zod';

import {
  commandOptionSchema,
  commandSchema,
  dictionaryResponseSchema,
} from '../schemas/dictionary.schema';

export type CommandOption = z.infer<typeof commandOptionSchema>;

export type Command = z.infer<typeof commandSchema>;

export type DictionaryResponse = z.infer<typeof dictionaryResponseSchema>;
