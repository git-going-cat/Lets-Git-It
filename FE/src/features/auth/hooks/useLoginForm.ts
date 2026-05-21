import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { type LoginFormValues, loginSchema } from '../schemas/login.schema';

import { useAuth } from './useAuth';

export type { LoginFormValues };

/**
 * 로그인 폼의 상태와 이벤트 처리를 담당하는 커스텀 훅.
 *
 * - `register`, `handleSubmit`, `errors`: react-hook-form 제어 객체
 * - `isSubmitting`: 제출 진행 중 여부
 * - `apiError`: 서버 응답 오류 메시지
 * - `onSubmit`: 폼 제출 핸들러
 */
export function useLoginForm() {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      setApiError(null); // 로그인 성공시에만 에러 메시지 초기화
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setApiError(axiosErr.response?.data?.message ?? '로그인에 실패했습니다.');
    }
  };

  return { register, handleSubmit, errors, isSubmitting, apiError, onSubmit };
}
