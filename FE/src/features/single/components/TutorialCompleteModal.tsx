import { useEffect } from 'react';

interface TutorialCompleteModalProps {
  isSkipped: boolean;
  onHome: () => void;
}

/**
 * 튜토리얼 완료(정상 종료 또는 스킵) 시 표시되는 모달.
 * Enter 키 또는 버튼 클릭으로 홈으로 이동합니다.
 */
export default function TutorialCompleteModal({ isSkipped, onHome }: TutorialCompleteModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onHome();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onHome]);

  return (
    // z-[80]: StartModal(z-50)이 남아 있는 튜토리얼 스킵 흐름에서도 완료 안내를 최상단에 표시합니다.
    <div className="font-pixel fixed inset-0 z-[80] flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-sm">
        <p className="title text-sm">{isSkipped ? 'TUTORIAL SKIPPED' : 'TUTORIAL COMPLETE'}</p>

        <div className="flex flex-col items-center gap-6 p-2">
          {isSkipped ? (
            <p className="text-xl text-gray-300 text-center leading-relaxed">
              튜토리얼을 건너뛰었습니다.
              <br />
              나중에 홈에서 다시 확인할 수 있어요!
            </p>
          ) : (
            <>
              <p className="text-4xl">🎉</p>
              <p className="text-xl text-yellow-400 text-center font-bold leading-relaxed">
                튜토리얼 완료!
              </p>
              <p className="text-base text-gray-300 text-center leading-relaxed">
                Git 기본 흐름을 모두 익혔습니다.
                <br />
                이제 진짜 게임을 시작해봐요!
              </p>
            </>
          )}

          {/* bg-[#...]: NES 버튼 success 팔레트와 맞춘 튜토리얼 완료 모달 전용 버튼 색상입니다. */}
          <button
            type="button"
            className="nes-rounded-button w-full overflow-hidden bg-[#92cc41] px-4 py-3 text-xl font-bold text-white shadow-sm transition-colors hover:bg-[#7fb832] active:bg-[#6fa326]"
            onClick={onHome}
          >
            ⌂ 홈으로 가기 [Enter ↵]
          </button>
        </div>
      </div>
    </div>
  );
}
