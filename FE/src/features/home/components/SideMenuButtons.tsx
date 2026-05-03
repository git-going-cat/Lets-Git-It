import dictionaryImg from '@/assets/home/dictionary.png';
import rankingImg from '@/assets/home/ranking.png';

import type { HomeModalType } from '../types/home.types';

interface SideMenuButtonsProps {
  onOpen: (modal: HomeModalType) => void;
}

/** 우측 중단 수직 배치 랭킹/도감 버튼 */
export default function SideMenuButtons({ onOpen }: SideMenuButtonsProps) {
  return (
    <div className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col gap-4">
      <button
        id="btn-ranking"
        type="button"
        onClick={() => onOpen('ranking')}
        className="flex flex-col items-center gap-1 transition-transform duration-150 hover:scale-110 active:scale-95"
        aria-label="랭킹"
      >
        <img
          src={rankingImg}
          alt="랭킹"
          className="pixel-art h-48 w-48 object-contain drop-shadow-lg"
          draggable={false}
        />
        <span className="-mt-10 text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          랭킹
        </span>
      </button>

      <button
        id="btn-dictionary"
        type="button"
        onClick={() => onOpen('dictionary')}
        className="flex flex-col items-center gap-1 transition-transform duration-150 hover:scale-110 active:scale-95"
        aria-label="도감"
      >
        <img
          src={dictionaryImg}
          alt="도감"
          className="pixel-art h-48 w-48 object-contain drop-shadow-lg"
          draggable={false}
        />
        <span className="-mt-10 text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          도감
        </span>
      </button>
    </div>
  );
}
