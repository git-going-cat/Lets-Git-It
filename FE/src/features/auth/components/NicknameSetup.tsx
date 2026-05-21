import { useNicknameSetup } from '../hooks/useNicknameSetup';

interface NicknameSetupProps {
  onComplete: () => void;
}

/**
 * 닉네임 설정 단계.
 * 입력 → 중복 확인 → 저장 후 onComplete를 호출합니다.
 */
export default function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const {
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
  } = useNicknameSetup(onComplete);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-white/50 text-xs text-center">
        2~6자, 영문·한글·숫자만 사용 가능 / 특수문자 금지
      </p>

      {/* 닉네임 입력 + 중복확인 */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            {...register('nickname')}
            type="text"
            placeholder="닉네임을 입력하세요."
            maxLength={6}
            className="flex-1 min-w-0 rounded bg-white/10 px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/30"
          />
          <button
            type="button"
            onClick={checkAvailability}
            disabled={!isValid || isChecking}
            className="shrink-0 px-3 py-2 rounded text-xs font-medium transition-colors border-none! bg-white/10! hover:bg-white/20! text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isChecking ? '확인 중...' : '중복확인'}
          </button>
        </div>

        {errors.nickname && <p className="text-red-400 text-xs ml-1">{errors.nickname.message}</p>}
        {isAvailable === true && !errors.nickname && (
          <p className="text-green-400 text-xs ml-1">사용 가능한 닉네임입니다.</p>
        )}
        {apiError && <p className="text-red-400 text-xs ml-1">{apiError}</p>}
      </div>

      {/* 다음 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={!isAvailable || isSaving || !nickname}
          className="px-5 py-2 rounded text-sm font-semibold transition-colors border-none! bg-white/10! hover:bg-white/20! text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isSaving ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  );
}
