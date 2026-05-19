import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';
import { createGameConfig } from '@/game/config';

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
import ResultModal from './ResultModal';
import SimpleInputBar from './SimpleInputBar';

export default function CoopPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const assignFallbackTimerRef = useRef<number | null>(null);
  const shouldLeaveRoomRef = useRef(true);
  const phase = useAtomValue(coopPhaseAtom);
  const setPhase = useSetAtom(coopPhaseAtom);
  const setInputBlocked = useSetAtom(coopInputBlockedAtom);
  const roomId = useCoopStore((state) => state.roomId);
  const clearSession = useCoopStore((state) => state.clearSession);
  const startKey = useCoopStore((state) => state.startKey);
  const startDelayMs = useCoopStore((state) => state.startDelayMs);
  const revealKey = useCoopStore((state) => state.revealKey);
  const revealDurationMs = useCoopStore((state) => state.revealDurationMs);
  const [countdownDoneStartKey, setCountdownDoneStartKey] = useState<number | null>(null);
  const [countdownDoneRevealKey, setCountdownDoneRevealKey] = useState<number | null>(null);
  const [showAssignedCard, setShowAssignedCard] = useState(false);
  const hasStartCountdown = startKey > 0 && startDelayMs > 0;
  const isStartCountdownDone = !hasStartCountdown || countdownDoneStartKey === startKey;
  const hasRevealPacket = revealKey > 0;
  const isCountdownDone = countdownDoneRevealKey === revealKey;
  const shouldLeaveRoom = useCallback(() => shouldLeaveRoomRef.current, []);

  useCoopGame();
  useRoomExitGuard({
    roomId,
    reset: clearSession,
    shouldLeave: shouldLeaveRoom,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      ...createGameConfig([CoopScene]),
      backgroundColor: 'rgba(0, 0, 0, 0)',
      parent: containerRef.current,
      transparent: true,
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'reveal' || !isStartCountdownDone || !hasRevealPacket || !isCountdownDone) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setShowAssignedCard(false);
      setPhase('assign');
      coopBus.emit('coop:reveal-ended');
    }, revealDurationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [hasRevealPacket, isCountdownDone, isStartCountdownDone, phase, revealDurationMs, setPhase]);

  useEffect(() => {
    if (phase !== 'assign') return;

    let timerId: number | null = null;
    assignFallbackTimerRef.current = window.setTimeout(() => {
      setShowAssignedCard(false);
      setInputBlocked(false);
      setPhase('input');
      coopBus.emit('coop:cards-hide');
      assignFallbackTimerRef.current = null;
    }, 10000);

    const unsubscribe = coopBus.subscribe('coop:shuffle-complete', () => {
      if (assignFallbackTimerRef.current !== null) {
        window.clearTimeout(assignFallbackTimerRef.current);
        assignFallbackTimerRef.current = null;
      }
      setShowAssignedCard(true);
      timerId = window.setTimeout(() => {
        setShowAssignedCard(false);
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
      if (assignFallbackTimerRef.current !== null) {
        window.clearTimeout(assignFallbackTimerRef.current);
        assignFallbackTimerRef.current = null;
      }
    };
  }, [phase, setInputBlocked, setPhase]);

  return (
    <div className="relative flex h-screen overflow-hidden text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />

      <div className="relative grid h-full flex-1 grid-rows-single-game">
        <CoopHUD />

        <div className="relative h-full w-full overflow-hidden">
          {/* Background color for Phaser container to avoid flickering before load, same as config.ts */}
          <div
            ref={containerRef}
            className={`pointer-events-none absolute inset-0 ${
              phase === 'assign' ? 'z-20' : 'z-0'
            }`}
          />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 pointer-events-none">
            {!isStartCountdownDone && (
              <RevealOverlay
                key={`start-${startKey}`}
                delayMs={startDelayMs}
                title="게임 시작"
                onCountdownComplete={() => setCountdownDoneStartKey(startKey)}
              />
            )}

            {phase === 'reveal' && isStartCountdownDone && hasRevealPacket && !isCountdownDone && (
              <RevealOverlay
                key={`reveal-${revealKey}`}
                title="순서를 암기하세요!"
                onCountdownComplete={() => setCountdownDoneRevealKey(revealKey)}
              />
            )}

            {phase === 'reveal' && isStartCountdownDone && hasRevealPacket && isCountdownDone && (
              <div className="relative flex w-full flex-1 items-center justify-center">
                <CoopCardArea />
              </div>
            )}

            {(phase === 'waiting' ||
              (phase === 'reveal' && (!isStartCountdownDone || !hasRevealPacket))) && (
              <div className="flex w-full max-w-4xl flex-1 items-center justify-center pointer-events-auto">
                <CoopGitShapePanel />
              </div>
            )}

            {phase === 'assign' && (
              <div className="relative flex w-full max-w-4xl flex-1 items-center justify-center">
                {showAssignedCard ? (
                  <div className="translate-x-8">
                    <CoopCardArea />
                  </div>
                ) : null}
              </div>
            )}

            {(phase === 'input' || phase === 'wrong' || phase === 'reset_wait') && (
              <div className="flex w-full max-w-4xl flex-1 items-center justify-center pointer-events-auto">
                <CoopGitShapePanel />
              </div>
            )}
          </div>
          <SirenOverlay />
        </div>

        <SimpleInputBar />
      </div>

      <div className="relative flex w-game-sidebar flex-col border-l border-gray-700">
        <CoopSidebar />
      </div>

      <ResultModal
        onBackToRoom={() => {
          shouldLeaveRoomRef.current = false;
        }}
      />
    </div>
  );
}
