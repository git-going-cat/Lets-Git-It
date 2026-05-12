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
}

export default function SingleGameContent({ onTutorialComplete }: SingleGameContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [shaking, setShaking] = useState(false);

  const { sessionId, difficulty, commandSet, isTutorial } = useSingleStore();
  const gameStatus = useAtomValue(gameStatusAtom);
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

  // 다시하기는 EventBus 'game:restart' 이벤트로 처리하므로,
  // sessionId/commandSet 변경마다 Phaser 인스턴스를 재생성하지 않는다.
  // hasSession boolean 트랜지션(false→true / true→false)에서만 effect가 발화하도록 deps를 단순화.
  // isTutorial은 게임 모드 자체가 달라지므로 계속 deps에 포함.
  const hasSession = !!sessionId && !!difficulty;
  useEffect(() => {
    if (!containerRef.current || !hasSession) return;

    // 최신 세션 데이터를 effect 진입 시점에 캡쳐 (deps 변경이 없으므로 첫 진입의 값이 사용됨)
    const initialSession = useSingleStore.getState();

    const game = new Phaser.Game({
      ...singleGameConfig,
      parent: containerRef.current,
      scene: [],
    });

    gameRef.current = game;

    game.events.once('ready', () => {
      game.scene.add('SingleScene', SingleScene, true, {
        sessionId: initialSession.sessionId,
        difficulty: initialSession.difficulty,
        commandSet: initialSession.commandSet,
        isTutorial: initialSession.isTutorial,
      });
      // 첫 진입 시 'game:start'는 StartModal에서, 다시하기는 'game:restart'로 처리하므로
      // 여기서 game:start를 emit하지 않는다.
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [hasSession, isTutorial]);

  return (
    <div className="relative flex h-screen overflow-hidden text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />
      <div className="relative flex w-game-sidebar flex-col">
        <SingleHUD />
      </div>
      <div className="relative grid h-full w-game-center grid-rows-single-game">
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
      <div className="relative flex w-game-sidebar flex-col">
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
          {overlayState && <TutorialOverlay state={overlayState} onNext={handleNext} />}
          {modalPhase === 'paused' && (
            <TutorialPauseModal onResume={handleResume} onSkip={handleSkip} />
          )}
          {modalPhase === 'completed' && (
            <TutorialCompleteModal isSkipped={false} onHome={onTutorialComplete ?? (() => {})} />
          )}
          {modalPhase === 'skipped' && (
            <TutorialCompleteModal isSkipped={true} onHome={onTutorialComplete ?? (() => {})} />
          )}
        </>
      )}
    </div>
  );
}
