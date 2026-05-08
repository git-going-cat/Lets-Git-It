import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { http } from '@/core/http';
import { apiResponseSchema } from '@/features/auth/schemas/response.schema';

import type { CharacterAsset } from '@/shared/types/user.types';

const characterAssetSchema = z.object({
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
});

const currentCharacterResponseSchema = apiResponseSchema(characterAssetSchema);

/**
 * 현재 로그인한 사용자의 캐릭터 외형 데이터를 조회한다.
 *
 * @description 캐릭터 렌더링 전용 공통 훅으로, mypage 수정 로직과 분리된 읽기 전용 데이터만 제공한다.
 */
export function useCurrentCharacterAsset() {
  return useQuery({
    queryKey: ['member', 'me', 'character'],
    queryFn: async (): Promise<CharacterAsset> => {
      const { data } = await http.get('/api/v1/members/me');
      const parsed = currentCharacterResponseSchema.parse(data);
      return parsed.data;
    },
    select: (data) => data,
  });
}
