import { useEffect, useId } from 'react';

import { useModal } from '@/shared/hooks/useModal';

interface TutorialPauseModalProps {
  onResume: () => void;
  onSkip: () => void;
}

/**
 * 튜토리얼 중 ESC 또는 ⏸ 버튼을 눌렀을 때 표시되는 모달.
 * Enter = 계속하기, ESC = 계속하기 (useModal), Escape 추가 누름 = 재진입 방지.
 */
export default function TutorialPauseModal({ onResume, onSkip }: TutorialPauseModalProps) {
  const { containerRef } = useModal({ isOpen: true, onClose: onResume });
  const titleId = useId();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (e.repeat) return;
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      onResume();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onResume]);

  return (
    // z-80: StartModal(z-50)이 열린 튜토리얼 첫 화면에서도 스킵 확인 모달을 최상단에 표시합니다.
    <div className="font-pixel fixed inset-0 z-80 flex items-center justify-center bg-black/80">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nes-container is-dark with-title w-full max-w-sm"
      >
        <p id={titleId} className="title text-base">
          SKIP TUTORIAL?
        </p>

        <div className="flex flex-col items-center gap-6 p-2">
          <p className="text-xl text-white text-center leading-relaxed">
            튜토리얼을 스킵하시겠습니까?
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              className="nes-rounded-button w-full overflow-hidden bg-nes-primary px-4 py-3 text-xl font-bold text-white shadow-sm transition-colors hover:bg-nes-primary-hover active:bg-nes-primary-active"
              onClick={onResume}
            >
              계속하기
            </button>
            <button
              type="button"
              className="nes-rounded-button w-full overflow-hidden bg-nes-error px-4 py-3 text-xl font-bold text-white shadow-sm transition-colors hover:bg-nes-error-hover active:bg-nes-error-active"
              onClick={onSkip}
            >
              튜토리얼 스킵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
