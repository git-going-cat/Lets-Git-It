import { ChevronRight } from 'lucide-react';

import googleIconSvg from '../assets/Web (mobile + desktop)/svg/neutral/web_neutral_rd_na.svg';
import { useLoginForm } from '../hooks/useLoginForm';

const GOOGLE_AUTH_URL = '/api/v1/oauth2/authorization/google';

interface LoginFormProps {
  onOpenSignUp: () => void;
  onOpenForgotPassword: () => void;
}

export default function LoginForm({ onOpenSignUp, onOpenForgotPassword }: LoginFormProps) {
  const { register, handleSubmit, errors, isSubmitting, apiError, onSubmit } = useLoginForm();

  return (
    <div className="w-80 flex flex-col gap-4">
      {/* 일반 로그인 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        {/* 아이디 */}
        <div>
          <input
            {...register('email')}
            type="email"
            placeholder="아이디(이메일)"
            className="w-full px-4 py-3 rounded-full bg-[#E4E4E4]/35 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white placeholder:text-white/80"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1 ml-2">{errors.email.message}</p>}
        </div>

        {/* 비밀번호 + 전송 버튼 */}
        <div>
          <div className="relative">
            <input
              {...register('password')}
              type="password"
              placeholder="비밀번호"
              className="w-full px-4 py-3 pr-12 rounded-full bg-[#E4E4E4]/35 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white placeholder:text-white/80"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="로그인"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full! border-none! bg-[#E4E4E4]/40 text-white flex items-center justify-center hover:bg-[#E4E4E4]/60 disabled:opacity-50 transition-colors shrink-0 overflow-hidden"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1 ml-2">{errors.password.message}</p>
          )}
        </div>

        {/* API 에러 */}
        {apiError && <p className="text-red-400 text-xs text-center">{apiError}</p>}
      </form>

      {/* 유틸 링크 */}
      <div className="flex justify-between text-xs text-white/80 px-2">
        <button
          type="button"
          onClick={onOpenForgotPassword}
          className="hover:text-white transition-colors"
        >
          비밀번호를 잊으셨나요?
        </button>
        <button type="button" onClick={onOpenSignUp} className="hover:text-white transition-colors">
          회원가입
        </button>
      </div>

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-white/20" />
        <span className="text-xs text-white/50">또는</span>
        <hr className="flex-1 border-white/20" />
      </div>

      {/* Google 소셜 로그인 (아이콘 전용, Google 공식 가이드라인) */}
      <div className="flex justify-center">
        <a href={GOOGLE_AUTH_URL} aria-label="구글로 로그인">
          <img src={googleIconSvg} alt="Google" width={40} height={40} />
        </a>
      </div>
    </div>
  );
}
