import { useMemo } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { DEFAULT_CHARACTER_VALUES } from '@/features/auth/utils/characterAssets';

import type { CharacterAsset } from '@/shared/types/user.types';

function resolveCharacterValue(value: string | undefined, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * 현재 로그인한 사용자의 캐릭터 외형 데이터를 authStore에서 조회합니다.
 *
 * @description `/api/v1/members/me` 중복 호출을 피하고, 캐릭터 수정 직후 `authStore.updateUser`
 * 갱신값이 싱글 화면에도 즉시 반영되도록 합니다.
 */
export function useCurrentCharacterAsset(): { data: CharacterAsset | null } {
  const user = useAuthStore((state) => state.user);
  const characterHair = useAuthStore((state) => state.user?.characterHair);
  const characterHairColor = useAuthStore((state) => state.user?.characterHairColor);
  const characterBody = useAuthStore((state) => state.user?.characterBody);
  const characterEye = useAuthStore((state) => state.user?.characterEye);
  const characterOutfit = useAuthStore((state) => state.user?.characterOutfit);
  const characterOutfitColor = useAuthStore((state) => state.user?.characterOutfitColor);

  const asset = useMemo<CharacterAsset | null>(() => {
    if (!user) return null;

    return {
      characterHair: resolveCharacterValue(characterHair, DEFAULT_CHARACTER_VALUES.characterHair),
      characterHairColor: resolveCharacterValue(
        characterHairColor,
        DEFAULT_CHARACTER_VALUES.characterHairColor
      ),
      characterBody: resolveCharacterValue(characterBody, DEFAULT_CHARACTER_VALUES.characterBody),
      characterEye: resolveCharacterValue(characterEye, DEFAULT_CHARACTER_VALUES.characterEye),
      characterOutfit: resolveCharacterValue(
        characterOutfit,
        DEFAULT_CHARACTER_VALUES.characterOutfit
      ),
      characterOutfitColor: resolveCharacterValue(
        characterOutfitColor,
        DEFAULT_CHARACTER_VALUES.characterOutfitColor
      ),
    };
  }, [
    user,
    characterHair,
    characterHairColor,
    characterBody,
    characterEye,
    characterOutfit,
    characterOutfitColor,
  ]);

  return { data: asset };
}
