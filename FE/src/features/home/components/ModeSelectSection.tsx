import multiFolderImg from '@/assets/home/multi-folder.png';
import singleFolderImg from '@/assets/home/single-folder.png';
import { analytics } from '@/lib/analytics';

import type { HomeModalType } from '../types/home.types';

interface ModeSelectSectionProps {
  onOpen: (modal: HomeModalType) => void;
}

export default function ModeSelectSection({ onOpen }: ModeSelectSectionProps) {
  return (
    <div className="flex gap-20">
      <button
        id="btn-single-mode"
        type="button"
        onClick={() => {
          analytics.gameModeSelected('single');
          onOpen('explorer-single');
        }}
        className="group flex flex-col items-center gap-0 transition-transform duration-150 hover:scale-110 active:scale-95"
        aria-label="싱글 모드"
      >
        <img
          src={singleFolderImg}
          alt="싱글모드"
          className="pixel-art h-40 w-40 object-contain drop-shadow-2xl"
          draggable={false}
        />
        <span className="-mt-2 text-2xl font-bold tracking-wide text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.8)]">
          싱글모드
        </span>
      </button>

      <button
        id="btn-multi-mode"
        type="button"
        onClick={() => {
          analytics.gameModeSelected('multi');
          onOpen('explorer-multi');
        }}
        className="group flex flex-col items-center gap-0 transition-transform duration-150 hover:scale-110 active:scale-95"
        aria-label="멀티 모드"
      >
        <img
          src={multiFolderImg}
          alt="멀티모드"
          className="pixel-art h-40 w-40 object-contain drop-shadow-2xl"
          draggable={false}
        />
        <span className="-mt-2 text-2xl font-bold tracking-wide text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.8)]">
          멀티모드
        </span>
      </button>
    </div>
  );
}
