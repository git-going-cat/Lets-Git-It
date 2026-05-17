import { useAtomValue } from 'jotai';

import PlayerCharacterPreview from '@/shared/components/PlayerCharacterPreview';

import {
  coopCurrentOrderAtom,
  coopInputBlockedAtom,
  coopResetTargetPlayerIdAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom } from '../store/coopPlayersAtom';

import type { CoopPlayer } from '../types/coop.types';
import type { CharacterAsset } from '@/shared/types/user.types';

function toCharacterAsset(player: CoopPlayer): CharacterAsset {
  return {
    characterHair: player.characterHair,
    characterHairColor: player.characterHairColor,
    characterBody: player.characterBody,
    characterEye: player.characterEye,
    characterOutfit: player.characterOutfit,
    characterOutfitColor: player.characterOutfitColor,
  };
}

export default function CoopSidebar() {
  const players = useAtomValue(coopPlayersAtom);
  const currentOrder = useAtomValue(coopCurrentOrderAtom);
  const isInputBlocked = useAtomValue(coopInputBlockedAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);

  return (
    <aside className="relative flex w-game-sidebar flex-col border-l border-gray-700 bg-[rgba(20,30,60,0.85)] backdrop-blur">
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
        <div className="nes-container is-rounded !bg-white !p-2">
          <p className="font-pixel text-center text-base text-gray-900">플레이어</p>
        </div>
        <ol className="flex flex-col gap-3">
          {players.map((player) => {
            const isCurrentTurn = player.commandOrder === currentOrder;
            const isWrongPlayer = player.playerId === resetTargetPlayerId;

            const cardBg = isCurrentTurn ? '!bg-yellow-100' : '!bg-white';

            return (
              <li key={player.playerId}>
                <section
                  className={`nes-container with-title is-rounded !mt-3 !p-3 ${cardBg} ${isWrongPlayer ? 'animate-pulse' : ''}`}
                >
                  <p
                    className={`title font-pixel !text-sm ${cardBg} ${isCurrentTurn ? '!text-amber-600' : '!text-gray-900'}`}
                  >
                    순서 {player.commandOrder}
                  </p>

                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-16 items-center justify-center relative">
                      {isInputBlocked && !isWrongPlayer && (
                        <div className="pointer-events-none absolute inset-0 bg-[rgba(180,20,20,0.12)] z-10" />
                      )}
                      <PlayerCharacterPreview
                        asset={toCharacterAsset(player)}
                        className="flex h-16 items-center justify-center"
                        characterClassName="w-9"
                      />
                    </div>

                    <span className="font-pixel w-full truncate text-center text-sm text-gray-900">
                      {player.nickname}
                      {player.isMe && <span className="ml-1 text-xs text-cyan-700">(나)</span>}
                    </span>

                    {isCurrentTurn && (
                      <div className="mt-1 w-full text-center">
                        <span className="text-[10px] text-amber-600 animate-pulse font-pixel">
                          ▶ 현재 순서
                        </span>
                      </div>
                    )}
                    {isWrongPlayer && (
                      <div className="mt-1 w-full text-center">
                        <span className="text-[10px] text-red-600 font-bold animate-pulse font-pixel">
                          🚨 오류!
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
