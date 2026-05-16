import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import { OTHER_PLAYER_FALLBACK_ASSET } from '../constants/character';
import { useContributionStore } from '../store/contributionStore';

import type { CharacterAsset } from '@/shared/types/user.types';

/**
 * 기여도 뺏기 게임 중 플레이어 캐릭터 스프라이트 오버레이.
 *
 * - Phaser 캔버스 컨테이너 안에 absolute로 배치 (싱글의 PlayerCharacter와 동일한 방식)
 * - 각 플레이어는 players 배열 인덱스를 슬롯으로 사용 (입장 순서 그대로)
 * - 위치: leftPercent = (laneIndex + (slotIndex + 0.5) / numSlots) / totalLanes * 100
 * - 내 캐릭터: authStore에서 조회 / 다른 플레이어: fallback 에셋
 * - 브랜치 정보는 store가 단일 source — POSITION_UPDATE는 useContributionGame이,
 *   내 git switch는 useContributionInput이 store를 직접 갱신.
 */
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
        // 내 asset 로딩 전에는 fallback으로 표시 — 내 캐릭터도 일단 보이게 해서 빈자리 생기지 않게.
        const asset: CharacterAsset = isMe
          ? (myAsset ?? OTHER_PLAYER_FALLBACK_ASSET)
          : OTHER_PLAYER_FALLBACK_ASSET;

        const leftPercent = ((laneIndex + (slotIndex + 0.5) / numSlots) / totalLanes) * 100;

        return (
          <div
            key={player.playerId}
            className="absolute bottom-2 z-10 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${leftPercent}%` }}
          >
            <span className={`font-pixel mb-1 text-xs ${isMe ? 'text-cyan-400' : 'text-gray-400'}`}>
              {isMe ? `▶ ${player.nickname}` : player.nickname}
            </span>
            <AnimatedCharacter asset={asset} animation="idle" className="h-24 w-12" />
          </div>
        );
      })}
    </>
  );
}
