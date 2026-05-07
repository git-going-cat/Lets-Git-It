import type React from 'react';

interface UseVerificationCodeInputOptions {
  /** 정규화된 값을 form에 반영하는 콜백 */
  setCode: (val: string) => void;
  /** 인증코드 전송 여부 — false이면 input이 비활성화됨 */
  codeSent: boolean;
}

/**
 * 인증코드 input에 공통으로 사용하는 커스텀 훅.
 *
 * - 입력값을 자동으로 대문자 변환 및 공백 제거
 * - codeSent 여부에 따라 disabled 상태 관리
 *
 * @example
 * const { codeInputProps } = useVerificationCodeInput({
 *   setCode: (val) => form.setValue('code', val, { shouldValidate: true }),
 *   codeSent,
 * });
 * <input {...codeInputProps} />
 */
export function useVerificationCodeInput({ setCode, codeSent }: UseVerificationCodeInputOptions) {
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/\s/g, '');
    setCode(val);
  };

  return {
    codeInputProps: {
      disabled: !codeSent,
      maxLength: 6,
      autoComplete: 'one-time-code' as const,
      spellCheck: false,
      autoCorrect: 'off' as const,
      onChange: handleCodeChange,
    },
  };
}
