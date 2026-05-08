import boardImg from '@/assets/home/board.png';

import { HOME_LINKS } from '../constants/homeLinks';

export default function BoardButton() {
  const handleClick = () => {
    if (!HOME_LINKS.BOARD_SURVEY) return;

    window.open(HOME_LINKS.BOARD_SURVEY, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      id="btn-board"
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center gap-1 transition-transform duration-150 hover:scale-110 active:scale-95"
      aria-label="설문조사"
    >
      <img
        src={boardImg}
        alt="설문조사"
        className="pixel-art h-28 w-28 object-contain drop-shadow-lg"
        draggable={false}
      />
      <span className="-mt-2 text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        설문조사
      </span>
    </button>
  );
}
