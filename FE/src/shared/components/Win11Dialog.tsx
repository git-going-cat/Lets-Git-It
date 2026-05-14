import { useId } from 'react';

import { useModal } from '@/shared/hooks/useModal';

import { Win11Window } from './Win11Window';

interface Win11DialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

/**
 * Win11Window 베이스 단순 확인 다이얼로그.
 * 메시지 1줄 + [확인] 버튼만 제공합니다. 게임 외부(데스크탑) 영역의 에러/안내 표시에 사용합니다.
 * 게임 내부 모달은 픽셀 스타일(PixelModal/NES container)을 사용하세요.
 */
export function Win11Dialog({ title, message, onClose }: Win11DialogProps) {
  const { containerRef } = useModal({ isOpen: true, onClose });
  const messageId = useId();

  return (
    <Win11Window
      title={title}
      onClose={onClose}
      ariaLabel={title}
      ariaDescribedBy={messageId}
      containerRef={containerRef}
    >
      <div className="flex min-w-72 flex-col gap-6">
        <p id={messageId} className="whitespace-pre-line text-sm text-gray-800">
          {message}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[#0078d4] px-6 py-1.5 text-sm font-semibold text-white outline-none! transition-colors hover:bg-[#106ebe] focus:outline-none! focus-visible:ring-2 focus-visible:ring-sky-500/40 active:bg-[#005a9e]"
          >
            확인
          </button>
        </div>
      </div>
    </Win11Window>
  );
}
