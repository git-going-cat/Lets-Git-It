import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  NICKNAME_RULE,
  nicknameFormSchema,
  type NicknameFormValues,
} from '@/shared/schemas/nickname.schema';

import { onboardingApi } from '../api/onboardingApi';
import { useAuthStore } from '../store/authStore';

/**
 * 닉네임 설정 단계의 상태와 핸들러를 제공합니다.
 *
 * 흐름: 입력 -> 중복확인 -> 저장 -> onComplete 호출
 */
export function useNicknameSetup(onComplete: () => void) {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [isChecking, setIsChecking] = useState(false);
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
  const isAvailable = checkedNickname === nickname ? rawIsAvailable : null;
  const apiError = checkedNickname === nickname ? rawApiError : null;

  const { mutate: saveNickname, isPending: isSaving } = useMutation({
    mutationFn: (values: NicknameFormValues) => onboardingApi.saveNickname(values.nickname),
    onSuccess: (_, values) => {
      // analytics identify는 로그인 시 memberId로 이미 호출됨 — 닉네임은 PII이므로 distinct_id 사용 금지
      updateUser({ nickname: values.nickname, onboardingStatus: 'NICKNAME_SET_DONE' });
      onComplete();
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : undefined;
      setRawApiError(message ?? NICKNAME_RULE.messages.saveFailed);
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
      if (!available) setRawApiError(NICKNAME_RULE.messages.duplicate);
    } catch {
      setCheckedNickname(nickname);
      setRawApiError(NICKNAME_RULE.messages.checkFailed);
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
