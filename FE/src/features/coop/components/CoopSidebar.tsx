import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';

import { buildCharacterPaths, loadImage } from '@/features/auth/utils/characterAssets';

import {
  coopCurrentOrderAtom,
  coopInputBlockedAtom,
  coopResetTargetPlayerIdAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom } from '../store/coopPlayersAtom';

import type { CoopPlayer } from '../types/coop.types';

function CoopCharacterSprite({ player }: { player: CoopPlayer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const paths = buildCharacterPaths(player);
    const layerPaths = [paths.body, paths.eyes, paths.outfit, paths.hair];
    const frameWidth = 48;
    const frameHeight = 96;
    const cropTop = 10;
    const srcX = 18 * frameWidth;
    const srcY = frameHeight;
    let cancelled = false;

    async function render(context: CanvasRenderingContext2D) {
      context.clearRect(0, 0, frameWidth, frameHeight);
      for (const src of layerPaths) {
        if (cancelled) return;
        const image = await loadImage(src);
        if (image && !cancelled) {
          context.drawImage(
            image,
            srcX,
            srcY + cropTop,
            frameWidth,
            frameHeight - cropTop,
            0,
            0,
            frameWidth,
            frameHeight
          );
        }
      }
    }

    void render(ctx);

    return () => {
      cancelled = true;
    };
  }, [player]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={96}
      className="h-32 w-16 [image-rendering:pixelated]"
      aria-label={`${player.nickname} 캐릭터`}
    />
  );
}

export default function CoopSidebar() {
  const players = useAtomValue(coopPlayersAtom);
  const currentOrder = useAtomValue(coopCurrentOrderAtom);
  const isInputBlocked = useAtomValue(coopInputBlockedAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);

  return (
    <aside className="z-20 flex h-full w-48 shrink-0 flex-col overflow-hidden bg-[rgba(20,30,60,0.85)] font-pixel text-white backdrop-blur">
      {players.map((player) => {
        const isCurrentTurn = player.commandOrder === currentOrder;
        const isWrongPlayer = player.playerId === resetTargetPlayerId;

        return (
          <section
            key={player.playerId}
            className={`relative flex min-h-0 flex-1 flex-col items-center justify-center border-b border-dotted border-white/20 px-4 py-3 ${
              isCurrentTurn ? 'bg-[rgba(5,175,242,0.12)]' : 'bg-[rgba(200,220,255,0.06)]'
            } ${isWrongPlayer ? 'border-red-500' : ''}`}
          >
            {isCurrentTurn && (
              <>
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#05AFF2]" />
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#05AFF2]">
                  ▶
                </span>
              </>
            )}
            {isInputBlocked && (
              <div className="pointer-events-none absolute inset-0 bg-[rgba(180,20,20,0.12)]" />
            )}
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="flex h-32 w-20 items-center justify-center border-2 border-dotted border-white/20 bg-[rgba(200,220,255,0.15)]">
                <CoopCharacterSprite player={player} />
              </div>
            </div>
            <div className="mt-1 flex w-full min-w-0 flex-col items-center gap-1">
              <span className="block w-full truncate text-center text-[10px] leading-4">
                {player.nickname}
              </span>
              {player.isMe && (
                <span className="border border-[#76BF41] bg-[#0d1117]/90 px-2 py-0.5 text-[9px] text-[#76BF41]">
                  나
                </span>
              )}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
