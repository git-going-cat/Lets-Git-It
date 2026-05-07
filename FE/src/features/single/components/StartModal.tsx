import { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * 게임 시작 전 `git clone <githubName>` 명령어를 입력받는 모달.
 * 튜토리얼 모드에서는 step 1 설명과 해설을 함께 표시합니다.
 * 정확한 명령어 입력 시 game:start 이벤트를 발행하고 게임 상태를 'playing'으로 전환합니다.
 */
export default function StartModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const { githubName, isTutorial } = useSingleStore();
  const tutorialStepMeta = useSingleStore((s) => s.tutorialStepMeta);

  const [inputValue, setInputValue] = useState('');
  const [isError, setIsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (gameStatus !== 'idle' || !githubName) return null;

  const tutorialMeta = tutorialStepMeta[0];
  const expectedCommand = `git clone ${githubName}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (inputValue.trim() === expectedCommand) {
      setGameStatus('playing');
      EventBus.emit('game:start');
    } else {
      setIsError(true);
      setInputValue('');
      setTimeout(() => setIsError(false), 800);
    }
  };

  return (
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-lg">
        <p className="title text-base">{isTutorial ? 'TUTORIAL' : 'MISSION START'}</p>

        <div className="flex flex-col gap-5 p-2">
          {isTutorial && tutorialMeta && (
            <>
              <p className="text-xl font-bold text-yellow-400">{tutorialMeta.title}</p>
              <div className="nes-container is-dark px-4 py-3">
                <p className="text-xl leading-relaxed text-white">{tutorialMeta.description}</p>
              </div>
              <p className="text-base text-gray-400">{tutorialMeta.explanation}</p>
            </>
          )}

          {!isTutorial && (
            <p className="text-xl leading-relaxed text-yellow-400">
              Repository를 클론해서 게임을 시작하세요!
            </p>
          )}

          <div>
            <p className="mb-1 text-base text-gray-400">입력할 명령어:</p>
            <div className="nes-container is-dark px-4 py-3">
              <p className="text-xl text-green-400">
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
                className={`nes-input is-dark w-full text-xl! ${isError ? 'is-error' : ''}`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onCopy={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                placeholder="명령어를 입력하세요..."
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </div>
            {isError && <p className="text-xl text-red-400">올바른 명령어를 입력하세요.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
