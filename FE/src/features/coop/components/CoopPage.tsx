import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import Phaser from 'phaser';

import { createGameConfig } from '@/game/config';
import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';

import { useCoopGame } from '../hooks/useCoopGame';
import { CoopScene } from '../scenes/CoopScene';
import { coopPhaseAtom } from '../store/coopPhaseAtom';
import { useCoopStore } from '../store/coopStore';

import CoopCardArea from './CoopCardArea';
import CoopGitShapePanel from './CoopGitShapePanel';
import CoopHUD from './CoopHUD';
import CoopMyCardPanel from './CoopMyCardPanel';
import CoopSidebar from './CoopSidebar';
import RevealOverlay from './overlays/RevealOverlay';
import SirenOverlay from './overlays/SirenOverlay';
import SimpleInputBar from './SimpleInputBar';

export default function CoopPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const phase = useAtomValue(coopPhaseAtom);
  const roomId = useCoopStore((state) => state.roomId);
  const clearSession = useCoopStore((state) => state.clearSession);

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

  return (
    <div className="relative flex h-screen overflow-hidden bg-black text-white">
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <main className="relative flex min-h-0 flex-1 flex-col px-8 pt-24 pb-10">
          <CoopHUD />

          <div className="flex flex-1 flex-col items-center justify-center gap-8 z-10">
            {phase === 'assign' && (
              <div className="relative flex w-full flex-1 items-center justify-center">
                <CoopGitShapePanel />
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <CoopCardArea />
                </div>
              </div>
            )}

            {(phase === 'input' || phase === 'wrong' || phase === 'reset_wait') && (
              <div className="flex w-full max-w-5xl flex-1 items-center justify-center gap-24">
                <CoopMyCardPanel />
                <CoopGitShapePanel />
              </div>
            )}
          </div>
          <SirenOverlay />
          {phase === 'reveal' && <RevealOverlay />}
        </main>
        <SimpleInputBar />
      </div>
      <CoopSidebar />
    </div>
  );
}
