import { http } from '@/core/http';

import type { DictionaryResponse } from '../types/dictionary.types';

export const fetchDictionary = async (): Promise<DictionaryResponse> => {
  const { data } = await http.get<{ message: string; data: DictionaryResponse }>(
    '/api/v1/dictionary/commands'
  );
  return data.data;
};
