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
    // z-[80]: StartModal(z-50)이 열린 튜토리얼 첫 화면에서도 스킵 확인 모달을 최상단에 표시합니다.
    <div className="font-pixel fixed inset-0 z-[80] flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-sm">
        <p className="title text-sm">SKIP TUTORIAL?</p>

        <div className="flex flex-col items-center gap-6 p-2">
          <p className="text-xl text-white text-center leading-relaxed">
            튜토리얼을 스킵하시겠습니까?
          </p>

          {/* bg-[#...]: NES 버튼 primary/error 팔레트와 맞춘 튜토리얼 모달 전용 버튼 색상입니다. */}
          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              className="nes-rounded-button w-full overflow-hidden bg-[#209cee] px-4 py-3 text-xl font-bold text-white shadow-sm transition-colors hover:bg-[#108de0] active:bg-[#0b78c2]"
              onClick={onResume}
            >
              계속하기 [Enter ↵]
            </button>
            <button
              type="button"
              className="nes-rounded-button w-full overflow-hidden bg-[#e76e55] px-4 py-3 text-xl font-bold text-white shadow-sm transition-colors hover:bg-[#d85f46] active:bg-[#c84f36]"
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
