import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { onboardingApi } from '../api/onboardingApi';
import { nicknameFormSchema, type NicknameFormValues } from '../schemas/onboarding.schema';
import { useAuthStore } from '../store/authStore';

/**
 * 닉네임 설정 단계의 상태와 핸들러를 제공합니다.
 *
 * 흐름: 입력 → 중복확인 → 저장 → onComplete 호출
 */
export function useNicknameSetup(onComplete: () => void) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameFormSchema),
    mode: 'onChange',
  });

  const nickname = watch('nickname') ?? '';

  // 닉네임이 변경되면 중복확인 결과 초기화 → 재확인 강제
  useEffect(() => {
    setIsAvailable(null);
    setApiError(null);
  }, [nickname]);

  const checkAvailability = async () => {
    setIsAvailable(null);
    setApiError(null);
    setIsChecking(true);
    try {
      const available = await onboardingApi.checkNickname(nickname);
      setIsAvailable(available);
      if (!available) setApiError('이미 사용 중인 닉네임입니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = async (values: NicknameFormValues) => {
    if (!isAvailable) return;
    setApiError(null);
    setIsSaving(true);
    try {
      await onboardingApi.saveNickname(values.nickname);
      updateUser({ nickname: values.nickname, onboardingStatus: 'NICKNAME_SET_DONE' });
      onComplete();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '닉네임 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    nickname,
    isValid,
    isChecking,
    isAvailable,
    isSaving,
    apiError,
    checkAvailability,
    onSubmit,
  };
}
