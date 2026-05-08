import { useEffect } from 'react';

interface TutorialPauseModalProps {
  onResume: () => void;
  onSkip: () => void;
}

/**
 * 튜토리얼 중 ESC 또는 ⏸ 버튼을 눌렀을 때 표시되는 모달.
 * Enter = 계속하기, Escape 추가 누름 = 재진입 방지.
 */
export default function TutorialPauseModal({ onResume, onSkip }: TutorialPauseModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onResume]);

  return (
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-sm">
        <p className="title text-sm">TUTORIAL PAUSED</p>

        <div className="flex flex-col items-center gap-6 p-2">
          <p className="text-xl text-white text-center leading-relaxed">튜토리얼을 계속할까요?</p>

          <div className="flex flex-col gap-3 w-full">
            <button type="button" className="nes-btn is-primary w-full text-xl" onClick={onResume}>
              ▶ 계속하기 [Enter ↵]
            </button>
            <button type="button" className="nes-btn is-error w-full text-xl" onClick={onSkip}>
              ✕ 튜토리얼 스킵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
