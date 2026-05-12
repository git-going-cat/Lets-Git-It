import { useEffect, useRef, useState } from 'react';
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

  // 항상 최신 nickname을 비동기 컨텍스트에서 참조하기 위한 ref.
  // 렌더 중 ref.current 직접 할당은 ESLint(react-hooks/refs) 위반이므로 useEffect로 동기화.
  const nicknameRef = useRef(nickname);
  useEffect(() => {
    nicknameRef.current = nickname;
  });

  // checkedNickname이 현재 입력과 다르면 null 반환 → stale 결과 자동 무효화.
  // nickname 변경 시 별도 setState 초기화 effect 불필요 (react-hooks/set-state-in-effect 방지).
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
    // 확인 시작 시점의 nickname을 캡처 — 비동기 완료 후 입력이 바뀌었으면 결과를 버림
    const targetNickname = nicknameRef.current;
    setRawIsAvailable(null);
    setRawApiError(null);
    setCheckedNickname(null);
    setIsChecking(true);

    try {
      const available = await onboardingApi.checkNickname(targetNickname);
      // 비동기 완료 후 입력이 변경되었으면 stale 결과 저장 방지
      if (nicknameRef.current !== targetNickname) return;
      setCheckedNickname(targetNickname);
      setRawIsAvailable(available);
      if (!available) setRawApiError(NICKNAME_RULE.messages.duplicate);
    } catch {
      if (nicknameRef.current !== targetNickname) return;
      setCheckedNickname(targetNickname);
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
