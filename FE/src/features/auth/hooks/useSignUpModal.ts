import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { authApi } from '../api/authApi';
import {
  signUpEmailSchema,
  type SignUpEmailValues,
  signUpPasswordSchema,
  type SignUpPasswordValues,
  signUpVerifySchema,
  type SignUpVerifyValues,
} from '../schemas/auth.schema';

type SignUpStep = 'email' | 'verify' | 'password' | 'done';

/**
 * 회원가입 모달의 단계별 상태와 핸들러를 제공합니다.
 *
 * 단계: email → verify → password → done
 * - email: 이메일 입력 후 인증 코드 발송
 * - verify: 수신한 인증 코드 검증
 * - password: 비밀번호 설정 후 회원가입 완료
 */
export function useSignUpModal() {
  const [step, setStep] = useState<SignUpStep>('email');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeExpiredAt, setCodeExpiredAt] = useState<string | null>(null);

  const emailForm = useForm<SignUpEmailValues>({
    resolver: zodResolver(signUpEmailSchema),
  });

  const verifyForm = useForm<SignUpVerifyValues>({
    resolver: zodResolver(signUpVerifySchema),
    defaultValues: { email: '', code: '' },
  });

  const passwordForm = useForm<SignUpPasswordValues>({
    resolver: zodResolver(signUpPasswordSchema),
  });

  const handleSendCode = async (values: SignUpEmailValues) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const { data } = await authApi.sendEmailCode('SIGN_UP', { email: values.email });
      setCodeExpiredAt(data.data.expiredAt);
      setVerifiedEmail(values.email);
      verifyForm.setValue('email', values.email);
      setStep('verify');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '인증 코드 발송에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (values: SignUpVerifyValues) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await authApi.verifyEmailCode({ email: values.email, code: values.code });
      setStep('password');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '인증 코드가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (values: SignUpPasswordValues) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await authApi.register({ email: verifiedEmail, password: values.password });
      setStep('done');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setStep('email');
    setVerifiedEmail('');
    setApiError(null);
    setCodeExpiredAt(null);
    emailForm.reset();
    verifyForm.reset();
    passwordForm.reset();
  };

  return {
    step,
    verifiedEmail,
    apiError,
    isSubmitting,
    codeExpiredAt,
    emailForm,
    verifyForm,
    passwordForm,
    handleSendCode,
    handleVerifyCode,
    handleRegister,
    reset,
  };
}
