import {
  formatPlayTime,
  formatScore,
  getGrade,
  getPlayTime,
  GRADE_COLOR_CLASSES,
} from '../utils/rankingFormat';

import type { RankGrade, RankingEntry, RankingMode } from '../types/ranking.types';

// ── 컴포넌트 ──────────────────────────────────────────────

interface RankingPodiumProps {
  mode: RankingMode;
  top3: RankingEntry[];
}

/**
 * TOP3 시상대 컴포넌트
 *
 * @description 2위(왼쪽) - 1위(가운데, 가장 높음) - 3위(오른쪽) 순서 배치
 */
export default function RankingPodium({ mode, top3 }: RankingPodiumProps) {
  if (top3.length === 0) return null;

  // 표시 순서: 2위 → 1위 → 3위
  const displayOrder = [top3[1], top3[0], top3[2]];
  const medals = ['🥈', '🥇', '🥉'];
  // 1위가 가장 높은 시상대 — 각 높이는 Tailwind 기본 스케일로 표현
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
          <div key={rank} className="flex flex-col items-center gap-2">
            {/* 메달 + 닉네임 */}
            <span className="text-2xl">{medals[idx]}</span>
            <span className="text-sm font-bold text-gray-800">{entry?.nickname ?? '-'}</span>

            {/* 점수 */}
            <span className="text-xs font-semibold text-gray-600">
              {entry ? formatScore(mode, entry) : '-'}
            </span>
            {shouldShowPlayTime && (
              <span className="text-[11px] font-medium text-gray-500">
                {entry ? formatPlayTime(getPlayTime(entry)) : '-'}
              </span>
            )}

            {/* 등급 뱃지 (협력 모드 제외) */}
            {grade && <GradeBadge grade={grade} />}

            {/* 시상대 기둥 */}
            {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
            <div
              className={`${podiumHeights[idx]} ${podiumClasses[idx]} flex w-20 items-end justify-center rounded-t-lg text-lg font-bold`}
            >
              {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
              <span className={`mb-2 ${rankTextClasses[idx]}`}>{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 등급 뱃지 ─────────────────────────────────────────────

interface GradeBadgeProps {
  grade: RankGrade;
}

function GradeBadge({ grade }: GradeBadgeProps) {
  return (
    <>
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_COLOR_CLASSES[grade]}`}
      >
        {grade}
      </span>
    </>
  );
}
