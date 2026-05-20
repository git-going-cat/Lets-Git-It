import multiFolderImg from '@/assets/home/multi-folder.png';

interface MultiModeButtonProps {
  onClick: () => void;
}

export default function MultiModeButton({ onClick }: MultiModeButtonProps) {
  return (
    <button
      id="btn-multi-mode"
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
      aria-label="멀티 모드"
    >
      <img
        src={multiFolderImg}
        alt="멀티모드"
        className="pixel-art h-40 w-40 object-contain drop-shadow-lg"
        draggable={false}
      />
      <span className="text-base font-bold tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        멀티모드
      </span>
    </button>
  );
}
