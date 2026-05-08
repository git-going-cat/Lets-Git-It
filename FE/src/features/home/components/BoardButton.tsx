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
      className="transition-transform duration-200 hover:scale-110 active:scale-90"
      aria-label="게시판 설문조사"
    >
      <img
        src={boardImg}
        alt="게시판"
        className="pixel-art h-15 w-15 object-contain drop-shadow-lg"
        draggable={false}
      />
    </button>
  );
}
