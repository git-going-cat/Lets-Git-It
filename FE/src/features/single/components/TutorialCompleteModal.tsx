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
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-sm">
        <p className="title text-sm">{isSkipped ? 'TUTORIAL SKIPPED' : 'TUTORIAL COMPLETE'}</p>

        <div className="flex flex-col items-center gap-6 p-2">
          {isSkipped ? (
            <p className="text-xl text-gray-300 text-center leading-relaxed">
              튜토리얼을 건너뛰었습니다.
              <br />
              나중에 사전에서 다시 확인할 수 있어요!
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

          <button type="button" className="nes-btn is-success w-full text-xl" onClick={onHome}>
            ⌂ 홈으로 가기 [Enter ↵]
          </button>
        </div>
      </div>
    </div>
  );
}
