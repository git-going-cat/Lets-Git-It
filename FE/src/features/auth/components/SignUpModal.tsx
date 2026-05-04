import { useSignUpModal } from '../hooks/useSignUpModal';

const GOOGLE_AUTH_URL = '/api/v1/oauth2/authorization/google';

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

interface SignUpModalProps {
  onClose: () => void;
}

/**
 * 회원가입 모달 — 한 화면에서 이메일 인증 → 비밀번호 설정 → 완료
 */
export default function SignUpModal({ onClose }: SignUpModalProps) {
  const {
    step,
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

  const emailValue = emailForm.watch('email');
  const codeValue = verifyForm.watch('code');
  const passwordValue = passwordForm.watch('password');
  const passwordConfirmValue = passwordForm.watch('passwordConfirm');

  const codeSent = step !== 'email';
  const codeVerified = step === 'password' || step === 'done';
  const isRegisterReady = codeVerified && !!passwordValue && !!passwordConfirmValue;

  if (step === 'done') {
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
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-2xl">🎉</h2>
            <div>
              <h3 className="font-semibold text-white">회원가입이 완료되었습니다.</h3>
              <p className="mt-1 text-xs text-white/60">로그인 후 모든 기능을 이용해보세요.</p>
            </div>
            <button type="button" onClick={handleClose} className={bigBtn(true)}>
              로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="mb-5 text-center">
          <h2 className="text-lg font-bold text-white">회원가입</h2>
          <p className="mt-1 text-xs text-white/50">계정 만들기</p>
        </div>

        <div className="flex flex-col gap-3">
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
                disabled={!emailValue || isSubmitting}
                onClick={emailForm.handleSubmit(handleSendCode)}
                className={inlineBtn(!!emailValue && !isSubmitting)}
              >
                {codeSent ? '재전송' : '인증코드 전송'}
              </button>
            </div>
            {emailForm.formState.errors.email && (
              <p className="ml-2 mt-1 text-xs text-red-400">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* 인증코드 행 */}
          <div>
            <div className="flex gap-2">
              <input
                {...verifyForm.register('code')}
                type="text"
                placeholder="인증코드 입력"
                maxLength={6}
                disabled={!codeSent}
                className="min-w-0 flex-1 rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!codeSent || !codeValue || isSubmitting || codeVerified}
                onClick={verifyForm.handleSubmit(handleVerifyCode)}
                className={inlineBtn(!!codeSent && !!codeValue && !isSubmitting && !codeVerified)}
              >
                {codeVerified ? '인증완료' : '인증코드 인증'}
              </button>
            </div>
            {verifyForm.formState.errors.code && (
              <p className="ml-2 mt-1 text-xs text-red-400">
                {verifyForm.formState.errors.code.message}
              </p>
            )}
            {codeExpiredAt && (
              <p className="ml-2 mt-1 text-xs text-white/40">코드 만료: {codeExpiredAt}</p>
            )}
          </div>

          {/* 비밀번호 */}
          <input
            {...passwordForm.register('password')}
            type="password"
            placeholder="비밀번호 입력"
            disabled={!codeVerified}
            className="w-full rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40"
          />
          {passwordForm.formState.errors.password && (
            <p className="ml-2 -mt-1 text-xs text-red-400">
              {passwordForm.formState.errors.password.message}
            </p>
          )}

          {/* 비밀번호 확인 */}
          <input
            {...passwordForm.register('passwordConfirm')}
            type="password"
            placeholder="비밀번호 확인"
            disabled={!codeVerified}
            className="w-full rounded-full bg-[#E4E4E4]/20 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40"
          />
          {passwordForm.formState.errors.passwordConfirm && (
            <p className="ml-2 -mt-1 text-xs text-red-400">
              {passwordForm.formState.errors.passwordConfirm.message}
            </p>
          )}
        </div>

        {apiError && <p className="mt-2 text-center text-xs text-red-400">{apiError}</p>}

        <button
          type="button"
          disabled={!isRegisterReady || isSubmitting}
          onClick={passwordForm.handleSubmit(handleRegister)}
          className={`mt-4 ${bigBtn(isRegisterReady && !isSubmitting)}`}
        >
          {isSubmitting ? '가입 중...' : '가입 완료'}
        </button>

        <p className="mt-3 text-center text-xs text-white/60">
          계정이 이미 있다면?{' '}
          <button
            type="button"
            onClick={handleClose}
            className="border-none! bg-transparent! font-semibold text-white hover:text-white/80"
          >
            로그인하기
          </button>
        </p>

        <div className="mt-3 flex items-center gap-3">
          <hr className="flex-1 border-white/20" />
          <span className="text-xs text-white/40">또는</span>
          <hr className="flex-1 border-white/20" />
        </div>
        <div className="mt-3 flex justify-center">
          <a
            href={GOOGLE_AUTH_URL}
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            구글로 시작하기
          </a>
        </div>
      </div>
    </div>
  );
}
