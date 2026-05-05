import { useQuery } from '@tanstack/react-query';

import { fetchDictionary } from '../api/dictionaryApi';

import type { DictionaryResponse } from '../types/dictionary.types';

export function useDictionary() {
  return useQuery({
    queryKey: ['dictionary'],
    queryFn: fetchDictionary,
    staleTime: Infinity,
    select: (data: DictionaryResponse) => data.commands,
  });
}
