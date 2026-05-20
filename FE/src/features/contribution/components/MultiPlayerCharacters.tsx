import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import { OTHER_PLAYER_FALLBACK_ASSET } from '../constants/character';
import { useContributionStore } from '../store/contributionStore';

import type { ContributionPlayer } from '../types/contribution.types';
import type { CharacterAsset } from '@/shared/types/user.types';

function toAsset(player: ContributionPlayer): CharacterAsset {
  return {
    characterHair: player.characterHair,
    characterHairColor: player.characterHairColor,
    characterBody: player.characterBody,
    characterEye: player.characterEye,
    characterOutfit: player.characterOutfit,
    characterOutfitColor: player.characterOutfitColor,
  };
}

/** Renders contribution players over the Phaser lanes. */
export default function MultiPlayerCharacters() {
  const players = useContributionStore((s) => s.players);
  const branches = useContributionStore((s) => s.branches);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);
  const { data: myAsset } = useCurrentCharacterAsset();

  const totalLanes = branches.length;
  const numSlots = players.length;

  return (
    <>
      {players.map((player, slotIndex) => {
        const laneIndex = branches.indexOf(player.currentBranch);
        if (laneIndex < 0) return null;

        const isMe = player.playerId === myPlayerId;
        const playerAsset = player.characterBody ? toAsset(player) : OTHER_PLAYER_FALLBACK_ASSET;
        const asset: CharacterAsset = isMe ? (myAsset ?? playerAsset) : playerAsset;
        const leftPercent = ((laneIndex + (slotIndex + 0.5) / numSlots) / totalLanes) * 100;

        return (
          <div
            key={player.playerId}
            className={`absolute bottom-2 z-10 flex -translate-x-1/2 flex-col items-center ${
              player.disconnected ? 'opacity-45 grayscale' : ''
            }`}
            style={{ left: `${leftPercent}%` }}
          >
            <span className={`font-pixel mb-1 text-xs ${isMe ? 'text-cyan-400' : 'text-gray-400'}`}>
              {isMe ? `나 ${player.nickname}` : player.nickname}
              {player.disconnected ? ' OUT' : ''}
            </span>
            <AnimatedCharacter asset={asset} animation="idle" className="h-24 w-12" />
          </div>
        );
      })}
    </>
  );
}
