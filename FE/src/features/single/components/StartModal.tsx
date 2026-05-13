import { useEffect, useId, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { analytics } from '@/lib/analytics';
import { useModal } from '@/shared/hooks/useModal';
import { gameStatusAtom, prePauseStatusAtom } from '@/shared/store/gameStatusAtom';

import { singleBus } from '../bridge/singleBus';
import { useSingleStore } from '../store/singleStore';

/**
 * 게임 시작 전 `git clone` 명령어를 입력받는 모달.
 * 튜토리얼 모드에서는 step 1 설명과 해설을 함께 표시합니다.
 * 정확한 명령어 입력 시 game:start 이벤트를 발행하고 게임 상태를 'playing'으로 전환합니다.
 */
export default function StartModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const prePauseStatus = useAtomValue(prePauseStatusAtom);
  const difficulty = useSingleStore((s) => s.difficulty);
  const isTutorial = useSingleStore((s) => s.isTutorial);
  const tutorialSteps = useSingleStore((s) => s.tutorialSteps);

  const [inputValue, setInputValue] = useState('');
  const [isError, setIsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // paused 상태여도 idle에서 넘어온 경우(StartModal 뒤에 PauseModal) 유지
  const shouldRender =
    gameStatus === 'idle' || (gameStatus === 'paused' && prePauseStatus === 'idle');
  const isOpen = shouldRender && !!difficulty;
  const { containerRef } = useModal({ isOpen });
  const titleId = useId();

  // useModal이 컨테이너로 포커스를 옮기지만, StartModal은 명령어 입력이 본 목적이라
  // input으로 즉시 포커스가 가야 한다. effect 선언 순서상 useModal 이후에 실행되므로
  // 컨테이너 포커스를 input으로 다시 옮긴다.
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const cloneCommand = tutorialSteps[0]?.commands[0];

  const expectedCommand = isTutorial
    ? (cloneCommand?.command ?? '')
    : `git clone https://${difficulty.toLowerCase()}.git`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (inputValue.trim() === expectedCommand) {
      analytics.gameStarted(isTutorial ? 'tutorial' : 'single', difficulty ?? undefined);
      setGameStatus('playing');
      singleBus.emit('game:start');
    } else {
      setIsError(true);
      setInputValue('');
    }
  };

  return (
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nes-container is-dark with-title w-full max-w-xl"
      >
        <p id={titleId} className="title text-xl">
          {isTutorial ? 'TUTORIAL' : 'MISSION START'}
        </p>

        <div className="flex flex-col gap-5 p-2">
          {isTutorial && tutorialSteps[0] && (
            <>
              <p className="text-2xl font-bold text-yellow-400">{tutorialSteps[0].title}</p>
              <div className="nes-container is-dark px-4 py-3">
                <p className="text-2xl leading-relaxed text-white">
                  {tutorialSteps[0].description}
                </p>
              </div>
              <p className="text-xl text-gray-400">{cloneCommand?.explanation}</p>
            </>
          )}

          {!isTutorial && (
            <p className="text-2xl leading-relaxed text-yellow-400">
              Repository를 클론해서 게임을 시작하세요!
            </p>
          )}

          <div>
            <p className="mb-1 text-xl text-gray-400">입력할 명령어:</p>
            <div className="nes-container is-dark px-4 py-3">
              <p className="text-2xl text-green-400">
                <span className="text-gray-500">$ </span>
                {expectedCommand}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className={`nes-field ${isError ? 'is-error' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                aria-label="실행할 명령어 입력"
                className={`nes-input is-dark w-full !text-2xl ${isError ? 'is-error' : ''}`}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (isError) setIsError(false);
                }}
                onKeyDown={handleKeyDown}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                placeholder="명령어를 입력하세요..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {isError && <p className="text-2xl text-red-400">올바른 명령어를 입력하세요.</p>}
          </div>
        </div>
        <p className="mt-3 text-center text-base text-gray-500">ESC — 설정</p>
      </div>
    </div>
  );
}
