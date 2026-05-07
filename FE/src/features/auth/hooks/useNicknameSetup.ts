import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { analytics } from '@/lib/analytics';

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
  /** 중복확인이 완료된 시점의 닉네임 */
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [rawIsAvailable, setRawIsAvailable] = useState<boolean | null>(null);
  const [rawApiError, setRawApiError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameFormSchema),
    mode: 'onChange',
  });

  const nickname = useWatch({ control, name: 'nickname' }) ?? '';

  // 닉네임이 바뀌면 이전 중복확인 결과는 무효 → 파생값으로 자동 처리
  const isAvailable = checkedNickname === nickname ? rawIsAvailable : null;
  const apiError = checkedNickname === nickname ? rawApiError : null;

  const { mutate: saveNickname, isPending: isSaving } = useMutation({
    mutationFn: (values: NicknameFormValues) => onboardingApi.saveNickname(values.nickname),
    onSuccess: (_, values) => {
      analytics.identifyUser(values.nickname);
      updateUser({ nickname: values.nickname, onboardingStatus: 'NICKNAME_SET_DONE' });
      onComplete();
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : undefined;
      setRawApiError(message ?? '닉네임 저장에 실패했습니다.');
      setCheckedNickname(nickname);
    },
  });

  const checkAvailability = async () => {
    setRawIsAvailable(null);
    setRawApiError(null);
    setCheckedNickname(null);
    setIsChecking(true);
    try {
      const available = await onboardingApi.checkNickname(nickname);
      setCheckedNickname(nickname);
      setRawIsAvailable(available);
      if (!available) setRawApiError('이미 사용 중인 닉네임입니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = (values: NicknameFormValues) => {
    if (!isAvailable) return;
    saveNickname(values);
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
