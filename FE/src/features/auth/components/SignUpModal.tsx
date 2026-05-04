import googleIconSvg from '../assets/Web (mobile + desktop)/svg/neutral/web_neutral_rd_na.svg';
import { useSignUpModal } from '../hooks/useSignUpModal';

const GOOGLE_AUTH_URL = '/api/v1/oauth2/authorization/google';

interface SignUpModalProps {
  onClose: () => void;
}

/**
 * 회원가입 모달 — email → verify → password → done 단계 흐름
 */
export default function SignUpModal({ onClose }: SignUpModalProps) {
  const {
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
  } = useSignUpModal();

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

        {/* ── 이메일 입력 단계 ── */}
        {step === 'email' && (
          <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">회원가입</h2>
              <p className="mt-1 text-xs text-white/50">이메일로 시작하기</p>
            </div>

            <div className="flex flex-col gap-2">
              <input
                {...emailForm.register('email')}
                type="email"
                placeholder="이메일 입력"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-400">{emailForm.formState.errors.email.message}</p>
              )}

              <input
                {...emailForm.register('email')}
                type="text"
                placeholder="이메일 확인"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
            </div>

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '발송 중...' : '인증코드 받기'}
            </button>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-white/20" />
              <span className="text-xs text-white/40">또는</span>
              <hr className="flex-1 border-white/20" />
            </div>

            <div className="flex justify-center">
              <a href={GOOGLE_AUTH_URL} aria-label="구글로 시작하기">
                <img src={googleIconSvg} alt="Google" width={40} height={40} />
              </a>
            </div>

            <p className="text-center text-xs text-white/40">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={handleClose}
                className="text-white/70 hover:text-white underline"
              >
                로그인
              </button>
            </p>
          </form>
        )}

        {/* ── 인증 코드 입력 단계 ── */}
        {step === 'verify' && (
          <form
            onSubmit={verifyForm.handleSubmit(handleVerifyCode)}
            className="flex flex-col gap-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">회원가입</h2>
              <p className="mt-1 text-xs text-white/50">이메일로 시작하기</p>
            </div>

            <div className="flex flex-col gap-2">
              <input
                {...verifyForm.register('email')}
                type="email"
                readOnly
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white/60 focus:outline-none"
              />

              <div className="flex gap-2">
                <input
                  {...verifyForm.register('code')}
                  type="text"
                  placeholder="인증코드 입력"
                  maxLength={6}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    verifyForm
                      .trigger('email')
                      .then(() => handleSendCode({ email: verifyForm.getValues('email') }))
                  }
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  인증코드 재발송
                </button>
              </div>
              {verifyForm.formState.errors.code && (
                <p className="text-xs text-red-400">{verifyForm.formState.errors.code.message}</p>
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
              disabled={isSubmitting}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '확인 중...' : '인증코드 확인'}
            </button>
          </form>
        )}

        {/* ── 비밀번호 입력 단계 ── */}
        {step === 'password' && (
          <form
            onSubmit={passwordForm.handleSubmit(handleRegister)}
            className="flex flex-col gap-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">회원가입</h2>
              <p className="mt-1 text-xs text-white/50">{verifiedEmail}</p>
            </div>

            <div className="flex flex-col gap-2">
              <input
                {...passwordForm.register('password')}
                type="password"
                placeholder="비밀번호 입력"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-red-400">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}

              <input
                {...passwordForm.register('passwordConfirm')}
                type="password"
                placeholder="비밀번호 확인"
                className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
              />
              {passwordForm.formState.errors.passwordConfirm && (
                <p className="text-xs text-red-400">
                  {passwordForm.formState.errors.passwordConfirm.message}
                </p>
              )}
            </div>

            {apiError && <p className="text-center text-xs text-red-400">{apiError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '가입 중...' : '가입 완료'}
            </button>
          </form>
        )}

        {/* ── 완료 단계 ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">회원가입 완료!</h2>
              <p className="mt-2 text-sm text-white/60">이제 로그인하여 게임을 시작해보세요.</p>
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
