import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { onboardingApi } from '../api/onboardingApi';
import { characterFormSchema, type CharacterFormValues } from '../schemas/onboarding.schema';

export const DEFAULT_CHARACTER: CharacterFormValues = {
  characterHair: 'Hair_01',
  characterHairColor: 'Hairstyle-color_01',
  characterBody: 'Body_01',
  characterEye: 'Eyes_01',
  characterOutfit: 'Outfit_01',
  characterOutfitColor: 'Outfit-color_01',
};

/** 선택 가능한 캐릭터 파츠 옵션 목록 (에셋 ID 기준) */
export const CHARACTER_OPTIONS = {
  hair: [
    { id: 'Hair_01', label: '스타일 1', color: '#2c1810' },
    { id: 'Hair_02', label: '스타일 2', color: '#8B4513' },
    { id: 'Hair_03', label: '스타일 3', color: '#DAA520' },
    { id: 'Hair_04', label: '스타일 4', color: '#1a1a2e' },
  ],
  hairColor: [
    { id: 'Hairstyle-color_01', label: '검정', color: '#1a1a1a' },
    { id: 'Hairstyle-color_02', label: '갈색', color: '#6B3A2A' },
    { id: 'Hairstyle-color_03', label: '금발', color: '#DAA520' },
    { id: 'Hairstyle-color_04', label: '회색', color: '#9CA3AF' },
  ],
  body: [
    { id: 'Body_01', label: '타입 1', color: '#FFDAB9' },
    { id: 'Body_02', label: '타입 2', color: '#DEB887' },
    { id: 'Body_03', label: '타입 3', color: '#8B6914' },
  ],
  eye: [
    { id: 'Eyes_01', label: '눈 1', color: '#4169E1' },
    { id: 'Eyes_02', label: '눈 2', color: '#228B22' },
    { id: 'Eyes_03', label: '눈 3', color: '#8B4513' },
    { id: 'Eyes_04', label: '눈 4', color: '#4a4a4a' },
  ],
  outfit: [
    { id: 'Outfit_01', label: '복장 1', color: '#1e3a5f' },
    { id: 'Outfit_02', label: '복장 2', color: '#2d4a1e' },
    { id: 'Outfit_03', label: '복장 3', color: '#4a1e3a' },
  ],
  outfitColor: [
    { id: 'Outfit-color_01', label: '네이비', color: '#003087' },
    { id: 'Outfit-color_02', label: '카키', color: '#4a5240' },
    { id: 'Outfit-color_03', label: '보라', color: '#4B0082' },
    { id: 'Outfit-color_04', label: '빨강', color: '#8B0000' },
  ],
} as const;

/**
 * 캐릭터 설정 단계의 상태와 핸들러를 제공합니다.
 *
 * - 각 파츠 선택 → form 값 업데이트 → 저장 → onComplete 호출
 */
export function useCharacterSetup(onComplete: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: DEFAULT_CHARACTER,
  });

  const onSubmit = async (values: CharacterFormValues) => {
    setApiError(null);
    setIsSaving(true);
    try {
      await onboardingApi.saveCharacter(values);
      onComplete();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '캐릭터 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return { form, isSaving, apiError, onSubmit };
}
