import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { authApi } from '../api/authApi';
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailValues,
  forgotPasswordResetSchema,
  type ForgotPasswordResetValues,
} from '../schemas/auth.schema';

type ForgotPasswordStep = 'email' | 'reset' | 'done';

/**
 * 비밀번호 찾기 모달의 단계별 상태와 핸들러를 제공합니다.
 *
 * 단계: email → reset → done
 * - email: 이메일 입력 후 인증 코드 발송 및 검증
 * - reset: 새 비밀번호 입력 후 비밀번호 재설정
 */
export function useForgotPasswordModal() {
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiredAt, setCodeExpiredAt] = useState<string | null>(null);

  const emailForm = useForm<ForgotPasswordEmailValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: '', code: '' },
  });

  const resetForm = useForm<ForgotPasswordResetValues>({
    resolver: zodResolver(forgotPasswordResetSchema),
  });

  const handleSendCode = async () => {
    const email = emailForm.getValues('email');
    const isValidEmail = await emailForm.trigger('email');
    if (!isValidEmail) return;

    setApiError(null);
    setIsSubmitting(true);
    try {
      const { data } = await authApi.sendEmailCode('PASSWORD_RESET', { email });
      setCodeExpiredAt(data.data.expiredAt);
      setCodeSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '인증 코드 발송에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndProceed = async (values: ForgotPasswordEmailValues) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyEmailCode({ email: values.email, code: values.code });
      setVerifiedEmail(values.email);
      setStep('reset');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '인증 코드가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (values: ForgotPasswordResetValues) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ email: verifiedEmail, newPassword: values.newPassword });
      setStep('done');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setStep('email');
    setVerifiedEmail('');
    setApiError(null);
    setCodeSent(false);
    setCodeExpiredAt(null);
    emailForm.reset();
    resetForm.reset();
  };

  return {
    step,
    apiError,
    isSubmitting,
    codeSent,
    codeExpiredAt,
    emailForm,
    resetForm,
    handleSendCode,
    handleVerifyAndProceed,
    handleResetPassword,
    reset,
  };
}
