import type { CharacterAsset } from '@/shared/types/user.types';

/**
 * 다른 플레이어의 캐릭터 fallback 에셋.
 * CONTRIBUTION_STARTED 페이로드에 다른 플레이어의 캐릭터 정보가 없어서
 * 임시로 동일한 기본 에셋을 사용한다. BE 스키마에 캐릭터 자산이 추가되면
 * 각 entry에서 직접 받도록 변경.
 */
export const OTHER_PLAYER_FALLBACK_ASSET: CharacterAsset = {
  characterHair: 'Hairstyle_01',
  characterHairColor: 'Hairstyle-color_01',
  characterBody: 'Body_01',
  characterEye: 'Eyes_01',
  characterOutfit: 'Outfit_01',
  characterOutfitColor: 'Outfit-color_01',
};
