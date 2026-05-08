import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { EventBus } from '@/core/bridge/EventBus';
import { singleGameConfig } from '@/game/config';

import { useSingleGame } from '../hooks/useSingleGame';
import { useTutorialMode } from '../hooks/useTutorialMode';
import { SingleScene } from '../scenes/SingleScene';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

import CatSprite from './CatSprite';
import CherryPickOverlay from './CherryPickOverlay';
import ChuruStack from './ChuruStack';
import CommandInput from './CommandInput';
import GameProgress from './GameProgress';
import PlayerCharacter from './PlayerCharacter';
import RestoreOverlay from './RestoreOverlay';
import SingleHUD from './SingleHUD';
import StashOverlay from './StashOverlay';
import TutorialCompleteModal from './TutorialCompleteModal';
import TutorialOverlay from './TutorialOverlay';
import TutorialPauseModal from './TutorialPauseModal';

interface SingleGameContentProps {
  onTutorialComplete?: () => void;
  onTutorialExit?: () => void;
}

export default function SingleGameContent({
  onTutorialComplete,
  onTutorialExit,
}: SingleGameContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [shaking, setShaking] = useState(false);

  const { sessionId, difficulty, commandSet, isTutorial } = useSingleStore();
  const gameStatus = useAtomValue(gameStatusAtom);
  const gameStatusRef = useRef(gameStatus);
  const totalCommands = useMemo(
    () => commandSet.filter((c) => c.type !== 'SWITCH').length,
    [commandSet]
  );

  useSingleGame();

  const triggerShake = useCallback(() => {
    setShaking(false);
    setTimeout(() => setShaking(true), 0);
  }, []);

  useEffect(() => {
    EventBus.on('command:wrong', triggerShake);
    return () => {
      EventBus.off('command:wrong', triggerShake);
    };
  }, [triggerShake]);

  const { overlayState, modalPhase, handleNext, handleResume, handleSkip } =
    useTutorialMode(isTutorial);

  useEffect(() => {
    if (modalPhase === 'skipped') {
      void onTutorialComplete?.();
    }
  }, [modalPhase, onTutorialComplete]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    if (!containerRef.current || !sessionId || !difficulty) return;

    const game = new Phaser.Game({
      ...singleGameConfig,
      parent: containerRef.current,
      scene: [],
    });

    gameRef.current = game;

    game.events.once('ready', () => {
      game.scene.add('SingleScene', SingleScene, true, {
        sessionId,
        difficulty,
        commandSet,
        isTutorial,
      });
      if (gameStatusRef.current === 'playing') EventBus.emit('game:start');
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sessionId, difficulty, commandSet, isTutorial]);

  return (
    <div className="relative flex h-screen overflow-hidden text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />
      <div className="relative flex w-[15%] flex-col">
        <SingleHUD />
      </div>
      <div className="relative grid h-full w-[70%] grid-rows-single-game">
        <GameProgress />
        <div
          ref={containerRef}
          className={`relative overflow-hidden ${shaking ? 'animate-screen-shake' : ''}`}
          onAnimationEnd={() => setShaking(false)}
        >
          <PlayerCharacter />
          <StashOverlay />
          <CherryPickOverlay />
          <RestoreOverlay />
        </div>
        <CommandInput />
      </div>
      <div className="relative flex w-[15%] flex-col">
        <div className="flex h-48 flex-col">
          <div className="flex justify-end p-2">
            {gameStatus !== 'idle' && (
              <button
                type="button"
                className="nes-btn text-2xl"
                onClick={() =>
                  isTutorial ? EventBus.emit('tutorial:pause') : EventBus.emit('game:pause')
                }
                aria-label="일시정지"
              >
                ⏸
              </button>
            )}
          </div>
          <div className="flex flex-1 items-end justify-center border-b border-gray-600">
            <CatSprite />
          </div>
        </div>
        <ChuruStack totalCommands={totalCommands} />
      </div>

      {/* 튜토리얼 전용 오버레이 및 모달 */}
      {isTutorial && (
        <>
          {overlayState && (
            <TutorialOverlay state={overlayState} onNext={handleNext} onExit={onTutorialExit} />
          )}
          {modalPhase === 'paused' && (
            <TutorialPauseModal onResume={handleResume} onSkip={handleSkip} />
          )}
          {modalPhase === 'completed' && (
            <TutorialCompleteModal isSkipped={false} onHome={onTutorialComplete ?? (() => {})} />
          )}
        </>
      )}
    </div>
  );
}
