import { useAtomValue } from 'jotai';

import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import { OTHER_PLAYER_FALLBACK_ASSET } from '../constants/character';
import { isCatEntry } from '../constants/score';
import { scoresAtom } from '../store/scoresAtom';

import PlayerRankingCard from './PlayerRankingCard';

export default function PlayerRankingList() {
  const scores = useAtomValue(scoresAtom);
  const { data: myAsset } = useCurrentCharacterAsset();

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="nes-container is-rounded !bg-white !p-2">
        <p className="font-pixel text-center text-base text-gray-900">기여도 랭킹</p>
      </div>
      <ol className="flex flex-col gap-3">
        {scores.map((entry) => {
          const isMiss = isCatEntry(entry.playerId);
          const asset = isMiss ? null : entry.isMe ? myAsset : OTHER_PLAYER_FALLBACK_ASSET;
          return (
            <li key={entry.playerId ?? 'cat'}>
              <PlayerRankingCard
                rank={entry.rank}
                nickname={entry.nickname}
                contribution={entry.contribution}
                asset={asset ?? null}
                isMe={entry.isMe}
                isMiss={isMiss}
                disconnected={entry.disconnected}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
