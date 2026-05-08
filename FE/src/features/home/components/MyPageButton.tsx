interface MyPageButtonProps {
  onClick: () => void;
}

/**
 * 하단 좌측 마이페이지 진입 버튼
 *
 * @description 클릭 시 MyPageModal 오픈
 */
export default function MyPageButton({ onClick }: MyPageButtonProps) {
  return (
    <button
      id="btn-mypage"
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-gray-800 transition-colors duration-150 hover:bg-white/50 active:scale-95"
      aria-label="마이페이지"
    >
      마이페이지
    </button>
  );
}
