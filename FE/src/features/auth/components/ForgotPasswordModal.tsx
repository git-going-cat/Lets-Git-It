import { useForgotPasswordModal } from '../hooks/useForgotPasswordModal';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

/**
 * 비밀번호 찾기 모달 — email(인증코드 발송+검증) → reset → done 단계 흐름
 */
export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const {
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
  } = useForgotPasswordModal();

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative w-80 rounded-2xl bg-[#1e2a3a]/90 p-8 shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* ── 이메일 + 인증코드 단계 ── */}
        {step === 'email' && (
          <form
            onSubmit={emailForm.handleSubmit(handleVerifyAndProceed)}
            className="flex flex-col gap-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">비밀번호를 잊으셨나요?</h2>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">
                가입하신 이메일 주소를 입력해주세요.
                <br />
                이메일로 비밀번호 재설정{' '}
                <span className="text-white/70 font-medium">인증 코드</span>를 보내드립니다.
                <br />
                받은 메일 함을 확인해 주세요.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  {...emailForm.register('email')}
                  type="email"
                  placeholder="이메일 입력"
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendCode}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  {codeSent ? '재발송' : '인증코드 받기'}
                </button>
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-400">{emailForm.formState.errors.email.message}</p>
              )}

              <div className="flex gap-2">
                <input
                  {...emailForm.register('code')}
                  type="text"
                  placeholder="인증코드 입력"
                  maxLength={6}
                  disabled={!codeSent}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!codeSent || isSubmitting}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  인증코드 확인
                </button>
              </div>
              {emailForm.formState.errors.code && (
                <p className="text-xs text-red-400">{emailForm.formState.errors.code.message}</p>
              )}
              {codeExpiredAt && (
                <p className="text-xs text-white/40">
                  만료 시각: {new Date(codeExpiredAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={!codeSent || isSubmitting}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '확인 중...' : '계속'}
            </button>
          </form>
        )}

        {/* ── 새 비밀번호 입력 단계 ── */}
        {step === 'reset' && (
          <form
            onSubmit={resetForm.handleSubmit(handleResetPassword)}
            className="flex flex-col gap-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">비밀번호 재설정</h2>
              <p className="mt-1 text-xs text-white/50">새로운 비밀번호를 재설정하세요</p>
            </div>

            <div className="flex flex-col gap-2">
              <input
                {...resetForm.register('newPassword')}
                type="password"
                placeholder="새 비밀번호"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              {resetForm.formState.errors.newPassword && (
                <p className="text-xs text-red-400">
                  {resetForm.formState.errors.newPassword.message}
                </p>
              )}

              <input
                {...resetForm.register('newPasswordConfirm')}
                type="password"
                placeholder="새 비밀번호 확인"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              {resetForm.formState.errors.newPasswordConfirm && (
                <p className="text-xs text-red-400">
                  {resetForm.formState.errors.newPasswordConfirm.message}
                </p>
              )}
            </div>

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '변경 중...' : '변경하기'}
            </button>
          </form>
        )}

        {/* ── 완료 단계 ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">비밀번호 변경 완료!</h2>
              <p className="mt-2 text-sm text-white/60">새 비밀번호로 로그인해주세요.</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-colors"
            >
              로그인하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
