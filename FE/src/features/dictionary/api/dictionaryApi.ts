import { http } from '@/core/http';

import { dictionaryResponseSchema } from '../schemas/dictionary.schema';

import type { DictionaryResponse } from '../types/dictionary.types';

export const fetchDictionary = async (): Promise<DictionaryResponse> => {
  const { data } = await http.get<{ message: string; data: unknown }>(
    '/api/v1/dictionary/commands'
  );

  const parsed = dictionaryResponseSchema.safeParse(data.data);
  if (!parsed.success) {
    throw new Error('올바르지 않은 도감 데이터 형식입니다.');
  }

  return parsed.data;
};
