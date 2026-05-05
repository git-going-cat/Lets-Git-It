import { useCountdown } from '../hooks/useCountdown';
import { useForgotPasswordModal } from '../hooks/useForgotPasswordModal';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const inlineBtn = (active: boolean) =>
  `shrink-0 rounded-full! border-none! px-3 py-2 text-xs font-medium transition-colors ${
    active
      ? 'bg-white! text-gray-900 cursor-pointer'
      : 'cursor-not-allowed border! border-white/50! bg-white/10 text-white/40'
  }`;

const bigBtn = (active: boolean) =>
  `w-full rounded-full! border-none! py-2.5 text-sm font-semibold transition-colors ${
    active
      ? 'bg-white! text-gray-900 cursor-pointer'
      : 'cursor-not-allowed border! border-white/50! bg-white/10 text-white/40'
  }`;

/**
 * 비밀번호 찾기 모달 — email(인증코드 발송+검증) → reset → done 단계 흐름
 */
export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const {
    step,
    apiError,
    isSendingCode,
    isVerifyingCode,
    isResettingPassword,
    codeSent,
    codeExpiredAt,
    emailForm,
    resetForm,
    handleSendCode,
    handleVerifyAndProceed,
    handleResetPassword,
    reset,
  } = useForgotPasswordModal();

  const handleClose = () => {
    reset();
    onClose();
  };

  const emailValue = emailForm.watch('email');
  const codeValue = emailForm.watch('code');
  const newPasswordValue = resetForm.watch('newPassword') ?? '';
  // 비밀번호 폼이 Zod 스키마를 완전히 통과했을 때만 활성화
  const isResetReady = resetForm.formState.isValid && resetForm.formState.isDirty;

  // Enter 키: codeSent 여부에 따라 전송 or 검증 분기
  const onEmailFormSubmit = emailForm.handleSubmit((data) => {
    if (!codeSent) {
      void handleSendCode();
    } else {
      void handleVerifyAndProceed(data);
    }
  });

  const { timeLeft, formattedTime } = useCountdown(codeExpiredAt);
  const isCodeExpired = codeSent && timeLeft === 0 && !!codeExpiredAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-96 rounded-2xl bg-[#131313]/95 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 border-none! bg-transparent! text-white/50 hover:text-white transition-colors"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* ── 이메일 + 인증코드 단계 ── */}
        {step === 'email' && (
          <form onSubmit={onEmailFormSubmit} className="flex flex-col gap-3">
            <div className="mb-2 text-center">
              <h2 className="text-2xl font-bold text-white">비밀번호를 잊으셨나요?</h2>
              <p className="mt-2 text-xs text-white/50 leading-relaxed">
                가입하신 이메일 주소를 입력해주세요.
                <br />
                이메일로 비밀번호 재설정 코드를 보내드립니다.
              </p>
            </div>

            {/* 이메일 행 */}
            <div>
              <div className="flex gap-2">
                <input
                  {...emailForm.register('email')}
                  type="email"
                  placeholder="이메일 입력"
                  className="min-w-0 flex-1 rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
                />
                <button
                  type="button"
                  disabled={!emailValue || isSendingCode}
                  onClick={handleSendCode}
                  className={inlineBtn(!!emailValue && !isSendingCode)}
                >
                  {isSendingCode ? '전송 중...' : codeSent ? '재전송' : '인증코드 전송'}
                </button>
              </div>
              {emailForm.formState.errors.email && (
                <p className="ml-2 mt-2 text-xs text-red-400">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* 인증코드 행 */}
            <div>
              <div className="flex gap-2">
                <input
                  {...emailForm.register('code')}
                  type="text"
                  placeholder="인증코드 입력"
                  maxLength={6}
                  disabled={!codeSent}
                  className="min-w-0 flex-1 rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={!codeSent || !codeValue || isVerifyingCode || isCodeExpired}
                  onClick={emailForm.handleSubmit(handleVerifyAndProceed)}
                  className={inlineBtn(
                    !!codeSent && !!codeValue && !isVerifyingCode && !isCodeExpired
                  )}
                >
                  {isVerifyingCode ? '확인 중...' : '인증코드 인증'}
                </button>
              </div>
              {emailForm.formState.errors.code && (
                <p className="ml-2 mt-1 text-xs text-red-400">
                  {emailForm.formState.errors.code.message}
                </p>
              )}
              {codeExpiredAt && (
                <p
                  className={`ml-2 mt-1 text-xs ${
                    timeLeft === null || timeLeft >= 30
                      ? 'text-white/80'
                      : timeLeft === 0
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }`}
                >
                  {timeLeft === null
                    ? '남은 시간: --:--'
                    : timeLeft === 0
                      ? '인증 코드가 만료되었습니다. 다시 요청해주세요.'
                      : `남은 시간: ${formattedTime}`}
                </p>
              )}
            </div>

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={!codeSent || !codeValue || isVerifyingCode || isCodeExpired}
              className={bigBtn(!!codeSent && !!codeValue && !isVerifyingCode && !isCodeExpired)}
            >
              계속
            </button>
          </form>
        )}

        {/* ── 비밀번호 재설정 단계 ── */}
        {step === 'reset' && (
          <form
            onSubmit={resetForm.handleSubmit(handleResetPassword)}
            className="flex flex-col gap-3"
          >
            <div className="mb-2 text-center">
              <h2 className="text-lg font-bold text-white">비밀번호 재설정</h2>
              <p className="mt-2 text-xs text-white/50">새로운 비밀번호를 입력하세요.</p>
            </div>

            <input
              {...resetForm.register('newPassword')}
              type="password"
              placeholder="새 비밀번호 입력"
              className="w-full rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
            />
            <ul className="-mt-1 ml-2 space-y-0.5">
              {(
                [
                  { label: '8자 이상', ok: newPasswordValue.length >= 8 },
                  { label: '영문자 포함', ok: /[A-Za-z]/.test(newPasswordValue) },
                  { label: '숫자 포함', ok: /[0-9]/.test(newPasswordValue) },
                  { label: '특수문자 포함', ok: /[^A-Za-z0-9]/.test(newPasswordValue) },
                ] as { label: string; ok: boolean }[]
              ).map(({ label, ok }) => (
                <li key={label} className={`text-xs ${ok ? 'text-green-400' : 'text-white/40'}`}>
                  {ok ? '✓' : '·'} {label}
                </li>
              ))}
            </ul>
            {resetForm.formState.errors.newPassword && (
              <p className="ml-2 -mt-1 text-xs text-red-400">
                {resetForm.formState.errors.newPassword.message}
              </p>
            )}

            <input
              {...resetForm.register('newPasswordConfirm')}
              type="password"
              placeholder="새 비밀번호 확인"
              className="w-full rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
            />
            {resetForm.formState.errors.newPasswordConfirm && (
              <p className="ml-2 -mt-1 text-xs text-red-400">
                {resetForm.formState.errors.newPasswordConfirm.message}
              </p>
            )}

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={!isResetReady || isResettingPassword}
              className={`mt-1 ${bigBtn(isResetReady && !isResettingPassword)}`}
            >
              {isResettingPassword ? '변경 중...' : '변경하기'}
            </button>
          </form>
        )}

        {/* ── 완료 단계 ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-2xl">✅</h2>
            <div>
              <h3 className="font-semibold text-white">비밀번호가 변경되었습니다.</h3>
              <p className="mt-1 text-xs text-white/60">새로운 비밀번호로 로그인해주세요.</p>
            </div>
            <button type="button" onClick={handleClose} className={bigBtn(true)}>
              로그인하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
