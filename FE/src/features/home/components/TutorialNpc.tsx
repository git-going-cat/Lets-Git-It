import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import npcDogImg from '@/assets/home/npc-dog.png';

/**
 * 하단 우측 튜토리얼 NPC (강아지 캐릭터 + 말풍선)
 *
 * @description 클릭 시 튜토리얼 페이지로 이동
 */
export default function TutorialNpc() {
  const navigate = useNavigate();
  const [showBubble, setShowBubble] = useState(true);

  const handleNpcClick = () => {
    void navigate({ to: '/tutorial' });
  };

  const handleCloseBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBubble(false);
  };

  return (
    <div className="absolute bottom-14 right-12 flex flex-col items-end gap-0">
      {showBubble && (
        <div className="relative -mb-6 max-w-48 rounded-xl bg-white px-4 py-3 text-base font-medium text-gray-800 shadow-xl">
          튜토리얼이 필요하면 저를 클릭해주세요
          <span className="absolute -bottom-2 right-4 border-4 border-transparent border-t-white" />
          <button
            type="button"
            onClick={handleCloseBubble}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-xs hover:bg-gray-400"
            aria-label="말풍선 닫기"
          >
            ✕
          </button>
        </div>
      )}
      <button
        id="btn-tutorial-npc"
        type="button"
        onClick={handleNpcClick}
        className="transition-transform duration-150 hover:scale-110 active:scale-95"
        aria-label="튜토리얼"
      >
        <img
          src={npcDogImg}
          alt="튜토리얼 NPC"
          className="pixel-art h-40 w-40 object-contain drop-shadow-lg"
          draggable={false}
        />
      </button>
    </div>
  );
}
