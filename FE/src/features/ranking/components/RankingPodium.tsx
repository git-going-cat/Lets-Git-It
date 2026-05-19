import {
  formatPlayTime,
  formatScore,
  getGrade,
  getPlayTime,
  GRADE_COLOR_CLASSES,
} from '../utils/rankingFormat';

import type {
  CoopRankingEntry,
  RankGrade,
  RankingEntry,
  RankingMode,
} from '../types/ranking.types';

interface RankingPodiumProps {
  mode: RankingMode;
  top3: RankingEntry[];
}

function isCoopEntry(entry: RankingEntry): entry is CoopRankingEntry {
  return 'clearTime' in entry && 'difficulty' in entry;
}

function getPodiumName(mode: RankingMode, entry?: RankingEntry) {
  if (!entry) return '-';
  if (mode === 'coop' && isCoopEntry(entry)) {
    return entry.teamName ?? entry.nickname ?? '-';
  }
  return 'nickname' in entry ? entry.nickname : '-';
}

export default function RankingPodium({ mode, top3 }: RankingPodiumProps) {
  if (top3.length === 0) return null;

  const displayOrder = [top3[1], top3[0], top3[2]];
  const medals = ['🥈', '🥇', '🥉'];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const podiumClasses = [
    'border-[1.5px] border-[rgba(140,170,210,0.35)] bg-[linear-gradient(180deg,#DDE8F5_0%,#B8CCE8_100%)]',
    'border-[1.5px] border-[rgba(220,170,30,0.3)] bg-[linear-gradient(180deg,#FFE5A0_0%,#F5C842_100%)]',
    'border-[1.5px] border-[rgba(190,140,90,0.3)] bg-[linear-gradient(180deg,#F5DEC8_0%,#E0B888_100%)]',
  ];
  const rankTextClasses = [
    'text-[#5a6a8a] opacity-[0.55]',
    'text-[#8a6a00] opacity-[0.55]',
    'text-[#7a5030] opacity-[0.55]',
  ];

  return (
    <div className="flex items-end justify-center gap-4 py-4">
      {displayOrder.map((entry, idx) => {
        const expectedRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
        const rank = entry?.rank ?? expectedRank;
        const grade = entry ? getGrade(mode, entry) : null;
        const shouldShowPlayTime = mode.startsWith('single-');

        return (
          <div key={`${rank}-${idx}`} className="flex flex-col items-center gap-2">
            <span className="text-2xl">{medals[idx]}</span>
            <span className="max-w-28 truncate text-sm font-bold text-gray-800">
              {getPodiumName(mode, entry)}
            </span>

            <span className="text-xs font-semibold text-gray-600">
              {entry ? formatScore(mode, entry) : '-'}
            </span>
            {shouldShowPlayTime && (
              <span className="text-[11px] font-medium text-gray-500">
                {entry ? formatPlayTime(getPlayTime(entry)) : '-'}
              </span>
            )}

            {grade && <GradeBadge grade={grade} />}

            <div
              className={`${podiumHeights[idx]} ${podiumClasses[idx]} flex w-20 items-end justify-center rounded-t-lg text-lg font-bold`}
            >
              <span className={`mb-2 ${rankTextClasses[idx]}`}>{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface GradeBadgeProps {
  grade: RankGrade;
}

function GradeBadge({ grade }: GradeBadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_COLOR_CLASSES[grade]}`}>
      {grade}
    </span>
  );
}
