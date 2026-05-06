import { useNavigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * 탈퇴 후 30일 이내 재가입(계정 복구) 시 표시하는 알림 화면.
 * 확인 후 /home으로 이동합니다.
 */
export default function ReactivationNotice() {
  const setReactivated = useAuthStore((s) => s.setReactivated);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    setReactivated(false);
    await navigate({ to: '/home' });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-[#1a1a1a] rounded-lg border border-white/10 p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="text-yellow-400 text-4xl mb-4">🔄</div>
        <h2 className="text-white font-semibold text-lg mb-2">계정이 복구되었습니다</h2>
        <p className="text-white/50 text-sm mb-6">
          탈퇴 후 30일 이내 재가입으로 기존 계정이 복구되었습니다.
          <br />
          다시 만나서 반가워요!
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-2.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border-none!"
        >
          확인
        </button>
      </div>
    </div>
  );
}
