import { useAtomValue } from 'jotai';

import PlayerCharacterPreview from '@/shared/components/PlayerCharacterPreview';

import { coopInputBlockedAtom, coopResetTargetPlayerIdAtom } from '../store/coopPhaseAtom';
import { coopPlayersAtom, coopPlayerStatsAtom } from '../store/coopPlayersAtom';

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
  const isInputBlocked = useAtomValue(coopInputBlockedAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);
  const playerStats = useAtomValue(coopPlayerStatsAtom);

  return (
    <aside className="relative flex w-52 shrink-0 flex-col border-l border-gray-700">
      <div className="flex h-full flex-col gap-3 p-2">
        <div className="nes-container is-rounded !bg-white !p-2 shrink-0">
          <p className="font-pixel text-center text-lg text-gray-900">플레이어</p>
        </div>
        <ol className="flex flex-1 flex-col justify-between gap-5 pb-2">
          {players.map((player) => {
            const isWrongPlayer = player.playerId === resetTargetPlayerId;
            const stats = playerStats[player.playerId] ?? { typoCount: 0, resetCount: 0 };
            const cardBg = player.isMe ? '!bg-yellow-100' : '!bg-white';

            return (
              <li key={player.playerId} className="flex min-h-0 flex-1">
                <section
                  className={`nes-container with-title is-rounded !m-0 !p-2 flex w-full flex-col justify-center ${cardBg} ${isWrongPlayer ? 'animate-pulse' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative flex h-16 shrink-0 items-center justify-center">
                      {isInputBlocked && !isWrongPlayer && (
                        <div className="pointer-events-none absolute inset-0 z-10 bg-[rgba(180,20,20,0.12)]" />
                      )}
                      {isWrongPlayer && (
                        <span className="pointer-events-none absolute top-0 z-20 animate-pulse whitespace-nowrap font-pixel text-base font-bold leading-none text-red-600">
                          순서 오류!
                        </span>
                      )}
                      <PlayerCharacterPreview
                        asset={toCharacterAsset(player)}
                        className="flex h-16 items-center justify-center"
                        characterClassName="w-10"
                      />
                    </div>

                    <span className="font-pixel w-full truncate text-center text-sm leading-tight text-gray-900">
                      {player.nickname}
                    </span>
                    <div className="flex w-full justify-center gap-2 font-pixel text-xs leading-none text-gray-700">
                      <span>오타 {stats.typoCount}</span>
                      <span>리셋 {stats.resetCount}</span>
                    </div>
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
