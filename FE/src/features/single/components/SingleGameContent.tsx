import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { createGameConfig } from '@/game/config';
import ConflictMiniGameOverlay from '@/shared/components/ConflictMiniGameOverlay';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { singleBus } from '../bridge/singleBus';
import { useSingleGame } from '../hooks/useSingleGame';
import { useTutorialMode } from '../hooks/useTutorialMode';
import { SingleScene } from '../scenes/SingleScene';
import { useSingleStore } from '../store/singleStore';
import { tutorialHighlightAtom } from '../store/tutorialHighlightAtom';

import CatSprite from './CatSprite';
import CherryPickOverlay from './CherryPickOverlay';
import ChuruStack from './ChuruStack';
import CommandInput from './CommandInput';
import GameEndScreen from './GameEndScreen';
import GameProgress from './GameProgress';
import HighlightRing from './HighlightRing';
import PlayerCharacter from './PlayerCharacter';
import RestoreOverlay from './RestoreOverlay';
import SingleHUD from './SingleHUD';
import StashOverlay from './StashOverlay';
import TutorialCompleteModal from './TutorialCompleteModal';
import TutorialOverlay from './TutorialOverlay';
import TutorialPauseModal from './TutorialPauseModal';
import TutorialSpotlight from './TutorialSpotlight';

interface SingleGameContentProps {
  onTutorialComplete?: () => void;
}

export default function SingleGameContent({ onTutorialComplete }: SingleGameContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [shaking, setShaking] = useState(false);

  const { sessionId, difficulty, commandSet, isTutorial } = useSingleStore();
  const gameStatus = useAtomValue(gameStatusAtom);
  const tutorialHighlight = useAtomValue(tutorialHighlightAtom);
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
    return singleBus.subscribe('command:wrong', triggerShake);
  }, [triggerShake]);

  // CONFLICT 미니게임은 shared 컴포넌트라 도메인 버스 의존이 없다 — wiring을 여기서 주입한다.
  const handleConflictResolve = useCallback((index: number) => {
    singleBus.emit('conflict:resolve', { index });
  }, []);
  const handleConflictTypo = useCallback((index: number) => {
    singleBus.emit('conflict:typo', { index });
  }, []);

  const {
    overlayState,
    modalPhase,
    showEndScreen,
    showCompletedModal,
    showSkippedModal,
    handleNext,
    handleResume,
    handleSkip,
    handleSkipFall,
    handleEndScreenDone,
  } = useTutorialMode(isTutorial);

  const handleTutorialHome = useCallback(() => {
    onTutorialComplete?.();
  }, [onTutorialComplete]);

  // 다시하기는 singleBus 'game:restart' 이벤트로 처리하므로,
  // sessionId/commandSet 변경마다 Phaser 인스턴스를 재생성하지 않는다.
  // hasSession boolean 트랜지션(false→true / true→false)에서만 effect가 발화하도록 deps를 단순화.
  // isTutorial은 게임 모드 자체가 달라지므로 계속 deps에 포함.
  const hasSession = !!sessionId && !!difficulty;
  useEffect(() => {
    if (!containerRef.current || !hasSession) return;

    // 최신 세션 데이터를 effect 진입 시점에 캡쳐 (deps 변경이 없으므로 첫 진입의 값이 사용됨)
    const initialSession = useSingleStore.getState();

    const game = new Phaser.Game({
      ...createGameConfig(),
      parent: containerRef.current,
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

      {/* 튜토리얼 하이라이트 스포트라이트 — z-10으로 배경을 어둡게, 강조 요소는 z-20으로 올라옴 */}
      {isTutorial && <TutorialSpotlight />}

      <div className="relative flex w-game-sidebar flex-col">
        <SingleHUD />
      </div>
      <div className="relative grid h-full w-game-center grid-rows-single-game">
        <GameProgress />
        {/* lanes wrapper: Phaser canvas + overflow-hidden + ref 특수성으로 HighlightRing(absolute) 대신 wrapper ring 유지 */}
        <div
          ref={containerRef}
          className={`relative overflow-hidden ${shaking ? 'animate-screen-shake' : ''} ${
            tutorialHighlight.includes('lanes') ? 'z-20 ring-2 ring-yellow-400' : ''
          }`}
          onAnimationEnd={() => setShaking(false)}
        >
          <PlayerCharacter />
          <StashOverlay />
          <CherryPickOverlay />
          <RestoreOverlay />
        </div>
        <HighlightRing target="history">
          <CommandInput />
        </HighlightRing>
      </div>
      <HighlightRing target="cat-churu" className="flex w-game-sidebar flex-col">
        <div className="flex h-48 flex-col">
          <div className="flex justify-end p-2">
            {gameStatus !== 'idle' && (
              <button
                type="button"
                className="nes-btn text-2xl"
                onClick={() =>
                  isTutorial ? singleBus.emit('tutorial:pause') : singleBus.emit('game:pause')
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
      </HighlightRing>

      {/* CONFLICT 미니게임 — viewport 기준 fixed로 떠 좁은 화면에서도 잘리지 않도록 게임 컨테이너 밖에 배치 */}
      <ConflictMiniGameOverlay onResolve={handleConflictResolve} onTypo={handleConflictTypo} />

      {/* 튜토리얼 전용 오버레이 및 모달 — phase 관리/전이 책임은 useTutorialMode가 갖고, 본 컴포넌트는 분기만 담당 */}
      {isTutorial && (
        <>
          {overlayState && (
            <TutorialOverlay state={overlayState} onNext={handleNext} onSkipFall={handleSkipFall} />
          )}
          {modalPhase === 'paused' && (
            <TutorialPauseModal onResume={handleResume} onSkip={handleSkip} />
          )}
          {showEndScreen && <GameEndScreen status="SUCCESS" onVideoEnd={handleEndScreenDone} />}
          {showCompletedModal && (
            <TutorialCompleteModal isSkipped={false} onHome={handleTutorialHome} />
          )}
          {showSkippedModal && (
            <TutorialCompleteModal isSkipped={true} onHome={handleTutorialHome} />
          )}
        </>
      )}
    </div>
  );
}
