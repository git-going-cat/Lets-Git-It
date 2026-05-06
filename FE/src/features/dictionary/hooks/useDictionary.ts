import { useQuery } from '@tanstack/react-query';

import { fetchDictionary } from '../api/dictionaryApi';

import type { DictionaryResponse } from '../types/dictionary.types';

/**
 * 도감(명령어 목록) 데이터를 조회하는 커스텀 훅
 *
 * @description API를 호출하여 도감 데이터를 가져오며, staleTime을 Infinity로 설정하여
 * 캐시된 데이터를 지속적으로 사용합니다.
 * @returns 명령어 목록 데이터 및 쿼리 상태
 */
export function useDictionary() {
  return useQuery({
    queryKey: ['dictionary'],
    queryFn: fetchDictionary,
    staleTime: Infinity,
    select: (data: DictionaryResponse) => data.commands,
  });
}
