import singleFolderImg from '@/assets/home/single-folder.png';

interface SingleModeButtonProps {
  onClick: () => void;
}

/** 싱글 모드 진입 버튼 (하단 중앙 좌측) */
export default function SingleModeButton({ onClick }: SingleModeButtonProps) {
  return (
    <button
      id="btn-single-mode"
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
      aria-label="싱글 모드"
    >
      <img
        src={singleFolderImg}
        alt="싱글모드"
        className="pixel-art h-40 w-40 object-contain drop-shadow-lg"
        draggable={false}
      />
      <span className="text-base font-bold tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        싱글모드
      </span>
    </button>
  );
}
