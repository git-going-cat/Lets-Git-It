import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { createGameConfig } from '@/game/config';
import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';

import { coopBus } from '../bridge/coopBus';
import { useCoopGame } from '../hooks/useCoopGame';
import { CoopScene } from '../scenes/CoopScene';
import { coopInputBlockedAtom, coopPhaseAtom } from '../store/coopPhaseAtom';
import { useCoopStore } from '../store/coopStore';

import CoopCardArea from './CoopCardArea';
import CoopGitShapePanel from './CoopGitShapePanel';
import CoopHUD from './CoopHUD';
import CoopSidebar from './CoopSidebar';
import RevealOverlay from './overlays/RevealOverlay';
import SirenOverlay from './overlays/SirenOverlay';
import SimpleInputBar from './SimpleInputBar';

interface CountdownState {
  phase: string;
  isDone: boolean;
}

type CountdownAction =
  | { type: 'phase-changed'; phase: string }
  | { type: 'countdown-complete'; phase: string };

function countdownReducer(state: CountdownState, action: CountdownAction): CountdownState {
  if (action.type === 'phase-changed') {
    return {
      phase: action.phase,
      isDone: action.phase === state.phase ? state.isDone : false,
    };
  }

  return {
    phase: action.phase,
    isDone: true,
  };
}

export default function CoopPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const phase = useAtomValue(coopPhaseAtom);
  const setPhase = useSetAtom(coopPhaseAtom);
  const setInputBlocked = useSetAtom(coopInputBlockedAtom);
  const roomId = useCoopStore((state) => state.roomId);
  const clearSession = useCoopStore((state) => state.clearSession);
  const [countdownState, dispatchCountdown] = useReducer(countdownReducer, {
    phase,
    isDone: false,
  });
  const isCountdownDone =
    phase === 'reveal' && countdownState.phase === phase && countdownState.isDone;

  useCoopGame();
  useRoomExitGuard({ roomId, reset: clearSession });

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      ...createGameConfig([CoopScene]),
      parent: containerRef.current,
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'reveal' || !isCountdownDone) return;

    const timerId = window.setTimeout(() => {
      setPhase('assign');
      coopBus.emit('coop:reveal-ended');
    }, 1500);

    return () => window.clearTimeout(timerId);
  }, [isCountdownDone, phase, setPhase]);

  const handleCountdownComplete = useCallback(() => {
    dispatchCountdown({ type: 'countdown-complete', phase: 'reveal' });
  }, []);

  useLayoutEffect(() => {
    dispatchCountdown({ type: 'phase-changed', phase });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'assign') return;

    let timerId: number | null = null;
    const unsubscribe = coopBus.subscribe('coop:shuffle-complete', () => {
      timerId = window.setTimeout(() => {
        setInputBlocked(false);
        setPhase('input');
        coopBus.emit('coop:cards-hide');
      }, 3000);
    });

    return () => {
      unsubscribe();
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [phase, setInputBlocked, setPhase]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-black text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main className="relative flex min-h-0 flex-1 flex-col px-8 pt-24 pb-10">
          <CoopHUD />

          <div className="flex flex-1 flex-col items-center justify-center gap-8 z-10">
            {phase === 'reveal' && (
              <div className="relative flex w-full flex-1 items-center justify-center">
                <CoopGitShapePanel />
                {isCountdownDone && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <CoopCardArea />
                  </div>
                )}
              </div>
            )}

            {phase === 'assign' && <div className="relative flex w-full flex-1" />}

            {(phase === 'input' || phase === 'wrong' || phase === 'reset_wait') && (
              <div className="flex w-full max-w-5xl flex-1 items-center justify-center">
                <CoopGitShapePanel />
              </div>
            )}
          </div>
          <SirenOverlay />
          {phase === 'reveal' && !isCountdownDone && (
            <RevealOverlay onCountdownComplete={handleCountdownComplete} />
          )}
        </main>
        <SimpleInputBar />
      </div>

      <CoopSidebar />
    </div>
  );
}
