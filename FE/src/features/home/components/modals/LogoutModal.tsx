import { useNavigate } from '@tanstack/react-router';

interface LogoutModalProps {
  onClose: () => void;
}

export default function LogoutModal({ onClose }: LogoutModalProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: 로그아웃 API 연동 (auth 팀원 협의 후 구현)
    void navigate({ to: '/' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-[320px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#f3f3f3] px-4 py-2">
          <span className="text-sm font-semibold text-gray-700">로그아웃</span>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6">
          <p className="text-center text-sm text-gray-700">로그아웃 하시겠습니까?</p>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded bg-[#0078d4] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#106ebe]"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
