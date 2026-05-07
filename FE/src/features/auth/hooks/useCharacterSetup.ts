import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { onboardingApi } from '../api/onboardingApi';
import { characterFormSchema, type CharacterFormValues } from '../schemas/onboarding.schema';
import { useAuthStore } from '../store/authStore';
import { CHARACTER_ASSET_OPTIONS, DEFAULT_CHARACTER_VALUES } from '../utils/characterAssets';

export const DEFAULT_CHARACTER: CharacterFormValues = DEFAULT_CHARACTER_VALUES;

/** 선택 가능한 캐릭터 파츠 옵션 목록 (public/ 에셋 ID 기준, 동적 경로 매핑) */
export const CHARACTER_OPTIONS = CHARACTER_ASSET_OPTIONS;

/**
 * 캐릭터 설정 단계의 상태와 핸들러를 제공합니다.
 *
 * - 각 파츠 선택 → form 값 업데이트 → 저장 → onComplete 호출
 */
export function useCharacterSetup(onComplete: () => void) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: DEFAULT_CHARACTER,
  });

  const { mutate: saveCharacter, isPending: isSaving } = useMutation({
    mutationFn: (values: CharacterFormValues) => onboardingApi.saveCharacter(values),
    onSuccess: (_, values) => {
      updateUser(values);
      onComplete();
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      setApiError(message ?? '캐릭터 저장에 실패했습니다.');
    },
  });

  const onSubmit = (values: CharacterFormValues) => {
    setApiError(null);
    saveCharacter(values);
  };

  return { form, isSaving, apiError, onSubmit };
}
