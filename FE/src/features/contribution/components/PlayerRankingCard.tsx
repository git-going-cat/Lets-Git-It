import PlayerCharacterPreview from '@/shared/components/PlayerCharacterPreview';

import MissCatSprite from './MissCatSprite';

import type { CharacterAsset } from '@/shared/types/user.types';

const MISS_CAT_HEIGHT = 64;

interface PlayerRankingCardProps {
  rank: number;
  nickname: string;
  contribution: number;
  asset: CharacterAsset | null;
  isMe?: boolean;
  isMiss?: boolean;
}

/**
 * 기여도 랭킹 카드 (nes.css 픽셀 스타일).
 * 상단: 등수 / 중앙: 캐릭터 / 하단: 이름 + 프로그래스 바.
 */
export default function PlayerRankingCard({
  rank,
  nickname,
  contribution,
  asset,
  isMe = false,
  isMiss = false,
}: PlayerRankingCardProps) {
  const clamped = Math.max(0, Math.min(100, contribution));
  const progressVariant = isMiss ? 'is-warning' : isMe ? 'is-primary' : 'is-success';
  const isFirst = rank === 1;
  const cardBg = isFirst ? '!bg-yellow-100' : '!bg-white';

  return (
    <section className={`nes-container with-title is-rounded !mt-3 !p-3 ${cardBg}`}>
      <p
        className={`title font-pixel !text-sm ${cardBg} ${
          isFirst ? '!text-amber-600' : '!text-gray-900'
        }`}
      >
        {rank}등
      </p>

      <div className="flex flex-col items-center gap-1">
        {/* 캐릭터 — 에셋 위쪽 25% 잘라내서 카드 슬림화 */}
        <div className="flex h-16 items-center justify-center">
          {isMiss ? (
            <MissCatSprite height={MISS_CAT_HEIGHT} />
          ) : (
            <PlayerCharacterPreview
              asset={asset}
              className="flex h-16 items-center justify-center"
              characterClassName="w-9"
            />
          )}
        </div>

        {/* 이름 */}
        <span className="font-pixel w-full truncate text-center text-sm text-gray-900">
          {nickname}
          {isMe && <span className="ml-1 text-xs text-cyan-700">(나)</span>}
        </span>

        {/* 프로그래스 + % */}
        <div className="flex w-full items-center gap-2">
          <progress
            className={`nes-progress ${progressVariant} !h-3 flex-1 ${
              isFirst
                ? '[&::-moz-progress-bar]:!bg-yellow-100 [&::-webkit-progress-bar]:!bg-yellow-100'
                : ''
            }`}
            value={clamped}
            max={100}
          />
          <span className="font-pixel shrink-0 text-xs tabular-nums text-gray-900">{clamped}%</span>
        </div>
      </div>
    </section>
  );
}
