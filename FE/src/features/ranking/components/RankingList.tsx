import { useEffect, useRef } from 'react';

import { useRanking } from '../hooks/useRanking';
import { formatScore, getGrade, getValueLabel, GRADE_COLORS } from '../utils/rankingFormat';

import type { MyRank, RankingEntry, RankingMode } from '../types/ranking.types';

// ── 컴포넌트 ──────────────────────────────────────────────

interface RankingListProps {
  mode: RankingMode;
  data: ReturnType<typeof useRanking>['data'];
}

/**
 * 순위 리스트 컴포넌트
 *
 * @description useInfiniteQuery 데이터를 받아 무한 스크롤 리스트 렌더링.
 *              생략 구간(···) 표시 및 내 순위(myRank) 하이라이트.
 */
export default function RankingList({ mode, data }: RankingListProps) {
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useRanking(mode);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (!data) return null;

  type InitialPage = { around?: RankingEntry[]; myRank?: MyRank };
  const initialPage = data.pages[0] as InitialPage;
  const around: RankingEntry[] = initialPage?.around ?? [];
  const myRank: MyRank | null = initialPage?.myRank ?? null;
  const myNickname = myRank && 'rank' in myRank ? getMyNickname(around, myRank.rank) : null;
  const valueLabel = getValueLabel(mode);
  const showGrade = mode !== 'coop';

  // 무한 스크롤 일반 리스트 추출
  const rankings = data.pages.flatMap((page) => {
    const p = page as { rankings?: RankingEntry[] };
    return p.rankings ?? [];
  });

  // 4위~내 순위 사이 생략 표시 로직
  // 일반 리스트의 마지막 rank와 around의 첫 rank 비교
  const lastRankingRank = rankings.length > 0 ? rankings[rankings.length - 1].rank : 3;
  const firstAroundRank = around.length > 0 ? around[0].rank : 0;
  const showEllipsis = firstAroundRank > lastRankingRank + 1;

  const renderEntry = (entry: RankingEntry, isAround = false) => {
    const isMe = myNickname !== null && entry.nickname === myNickname;
    const grade = getGrade(mode, entry);

    return (
      <div key={`${isAround ? 'around-' : ''}${entry.rank}`}>
        {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
        <div
          className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
            isMe ? 'font-medium' : 'text-gray-700'
          }`}
          style={
            isMe
              ? {
                  background: 'rgba(5,175,242,0.1)',
                  borderTop: '1px solid rgba(5,175,242,0.3)',
                  borderBottom: '1px solid rgba(5,175,242,0.3)',
                  color: '#0078D4',
                }
              : { borderBottom: '1px solid rgba(100,140,200,0.07)' }
          }
        >
          <span className="w-12 text-center font-bold">{entry.rank}</span>
          <span className="flex flex-1 items-center gap-1.5">
            {entry.nickname}
            {isMe && (
              <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-xs font-bold text-white">
                나
              </span>
            )}
          </span>
          <span className="w-24 text-right font-semibold">{formatScore(mode, entry)}</span>
          {showGrade && (
            <span className="flex w-14 justify-center">
              {grade && (
                <>
                  {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: GRADE_COLORS[grade].bg,
                      color: GRADE_COLORS[grade].text,
                      border: GRADE_COLORS[grade].border,
                    }}
                  >
                    {grade}
                  </span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <div
        className="flex items-center px-4 py-2 text-xs font-semibold"
        style={{ background: 'rgba(100,140,200,0.07)', color: '#7a8aaa' }}
      >
        <span className="w-12 text-center">순위</span>
        <span className="flex-1">닉네임</span>
        <span className="w-24 text-right">{valueLabel}</span>
        {showGrade && <span className="w-14 text-center">등급</span>}
      </div>

      {/* 일반 무한 스크롤 리스트 */}
      {rankings.map((entry) => renderEntry(entry))}

      {/* 생략 행 */}
      {showEllipsis && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-400">···</div>
      )}

      {/* 내 근처 순위 (around) */}
      {around.map((entry) => renderEntry(entry, true))}

      {/* 무한 스크롤 트리거 영역 */}
      <div ref={observerTarget} className="py-2 flex justify-center">
        {isFetchingNextPage && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        )}
      </div>

      {/* 하단 고정 텍스트 */}
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <div
        className="px-4 py-2 text-center text-xs"
        style={{
          background: 'rgba(100,140,200,0.05)',
          borderTop: '1px solid rgba(100,140,200,0.1)',
          color: '#9aaac8',
        }}
      >
        매주 월요일 00:00 초기화
      </div>
    </div>
  );
}

/** around 배열에서 내 순위에 해당하는 닉네임 추출 */
function getMyNickname(around: RankingEntry[], myRankValue: number): string | null {
  const me = around.find((entry) => entry.rank === myRankValue);
  return me?.nickname ?? null;
}
