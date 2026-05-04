import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useRankingWindow } from '../hooks/useRankingWindow';
import { formatScore, getGrade, getValueLabel, GRADE_COLORS } from '../utils/rankingFormat';

import type { useRanking } from '../hooks/useRanking';
import type { MyRank, RankingEntry, RankingMode, WeekParam } from '../types/ranking.types';

type RankingQueryResult = ReturnType<typeof useRanking>;
type RankingDirection = 'up' | 'down';

interface RankingListProps {
  mode: RankingMode;
  data: RankingQueryResult['data'];
  fetchNextPage: RankingQueryResult['fetchNextPage'];
  hasNextPage: RankingQueryResult['hasNextPage'];
  isFetchingNextPage: RankingQueryResult['isFetchingNextPage'];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scrollResetKey: string;
  selectedWeek: WeekParam | null;
}

interface InitialRankingPage {
  around?: RankingEntry[];
  myRank?: MyRank;
  nextCursor?: number | null;
  hasNext?: boolean;
}

/**
 * 랭킹 모달의 리스트 영역을 렌더링한다.
 *
 * @description RankingPodium이 top3를 담당하므로 이 컴포넌트는 초기 around와
 *              사용자 스크롤 이후의 위/아래 추가 랭킹만 렌더링한다.
 */
export default function RankingList({
  mode,
  data,
  isFetchingNextPage,
  scrollContainerRef,
  scrollResetKey,
  selectedWeek,
}: RankingListProps) {
  const upperObserverTarget = useRef<HTMLDivElement>(null);
  const lowerObserverTarget = useRef<HTMLDivElement>(null);
  const myRankTargetRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToMyRankRef = useRef(false);
  const suppressScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const scrollDirectionRef = useRef<RankingDirection | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const initialPage = data?.pages[0] as InitialRankingPage | undefined;
  const around = mergeRankingEntries(initialPage?.around ?? []);
  const myRank = initialPage?.myRank ?? null;
  const myRankValue = myRank?.rank ?? null;
  const firstAroundRank = around[0]?.rank ?? null;
  const lastAroundRank = around[around.length - 1]?.rank ?? null;
  const initialLowerCursor = initialPage?.nextCursor ?? null;
  const initialHasUpper = firstAroundRank !== null && firstAroundRank > 1;
  const initialHasLower = Boolean(initialPage?.hasNext);

  const {
    upperList,
    lowerList,
    hasUpper,
    hasLower,
    loadUpperRankings,
    loadLowerRankings,
    shouldAdjustUpperScrollRef,
    prevScrollHeightRef,
  } = useRankingWindow({
    mode,
    selectedWeek,
    scrollContainerRef,
    scrollResetKey,
    initialUpperCursor: firstAroundRank,
    initialLowerCursor,
    initialHasUpper,
    initialHasLower,
  });

  const valueLabel = getValueLabel(mode);
  const showGrade = mode !== 'coop';
  const aroundRankSet = createRankSet(around);
  const visibleUpperList = mergeRankingEntries(upperList).filter(
    (entry) =>
      !aroundRankSet.has(entry.rank) && (firstAroundRank === null || entry.rank < firstAroundRank)
  );
  const visibleAround = around;
  const loadedRankSet = createRankSet([...visibleUpperList, ...visibleAround]);
  const visibleLowerList = mergeRankingEntries(lowerList).filter(
    (entry) =>
      !loadedRankSet.has(entry.rank) && (lastAroundRank === null || entry.rank > lastAroundRank)
  );
  const showUpperGap = firstAroundRank !== null && firstAroundRank > 1 && hasUpper;

  const myRankCallback = useCallback(
    (node: HTMLDivElement | null) => {
      myRankTargetRef.current = node;
      if (!scrollResetKey || !node || hasScrolledToMyRankRef.current || !scrollContainerRef.current)
        return;

      suppressScrollRef.current = true;
      node.scrollIntoView({ behavior: 'instant', block: 'center' });
      lastScrollTopRef.current = scrollContainerRef.current.scrollTop;
      hasScrolledToMyRankRef.current = true;
      requestAnimationFrame(() => {
        suppressScrollRef.current = false;
      });
    },
    [scrollContainerRef, scrollResetKey]
  );

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return undefined;

    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      if (nextScrollTop === lastScrollTopRef.current) return;

      const direction: RankingDirection = nextScrollTop > lastScrollTopRef.current ? 'down' : 'up';
      scrollDirectionRef.current = direction;
      lastScrollTopRef.current = nextScrollTop;

      if (suppressScrollRef.current) return;
      if (!hasUserScrolled) {
        setHasUserScrolled(true);
      }

      if (
        direction === 'up' &&
        upperObserverTarget.current &&
        isElementVisible(upperObserverTarget.current, scrollContainer)
      ) {
        void loadUpperRankings();
      }
      if (
        direction === 'down' &&
        lowerObserverTarget.current &&
        isElementVisible(lowerObserverTarget.current, scrollContainer)
      ) {
        void loadLowerRankings();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    if (!hasUserScrolled) {
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    const upperObserver =
      upperObserverTarget.current && showUpperGap
        ? new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting && scrollDirectionRef.current === 'up') {
                void loadUpperRankings();
              }
            },
            { root: scrollContainer, threshold: 1.0 }
          )
        : null;
    const lowerObserver =
      lowerObserverTarget.current && hasLower
        ? new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting && scrollDirectionRef.current === 'down') {
                void loadLowerRankings();
              }
            },
            { root: scrollContainer, threshold: 1.0 }
          )
        : null;

    if (upperObserverTarget.current) {
      upperObserver?.observe(upperObserverTarget.current);
    }
    if (lowerObserverTarget.current) {
      lowerObserver?.observe(lowerObserverTarget.current);
    }

    return () => {
      upperObserver?.disconnect();
      lowerObserver?.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [
    hasLower,
    hasUserScrolled,
    loadLowerRankings,
    loadUpperRankings,
    scrollContainerRef,
    showUpperGap,
  ]);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !shouldAdjustUpperScrollRef.current) return;

    const scrollHeightDiff = scrollContainer.scrollHeight - prevScrollHeightRef.current;
    if (scrollHeightDiff > 0) {
      scrollContainer.scrollTop += scrollHeightDiff;
    }
    shouldAdjustUpperScrollRef.current = false;
  }, [prevScrollHeightRef, scrollContainerRef, shouldAdjustUpperScrollRef, upperList.length]);

  if (!data) return null;

  const renderEntry = (entry: RankingEntry) => {
    const isMe = myRankValue !== null && entry.rank === myRankValue;
    const grade = getGrade(mode, entry);

    return (
      <div key={entry.rank} ref={isMe ? myRankCallback : undefined}>
        {/* Tailwind 기본 색상으로 표현하기 어려운 반투명 내 순위 하이라이트 */}
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
              )}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Tailwind 기본 색상으로 표현하기 어려운 연한 헤더 배경 */}
      <div
        className="flex items-center px-4 py-2 text-xs font-semibold"
        style={{ background: 'rgba(100,140,200,0.07)', color: '#7a8aaa' }}
      >
        <span className="w-12 text-center">순위</span>
        <span className="flex-1">닉네임</span>
        <span className="w-24 text-right">{valueLabel}</span>
        {showGrade && <span className="w-14 text-center">등급</span>}
      </div>

      {showUpperGap && (
        <div
          ref={upperObserverTarget}
          className="flex items-center justify-center py-2 text-sm text-gray-400"
        >
          ···
        </div>
      )}
      {visibleUpperList.map((entry) => renderEntry(entry))}
      {visibleAround.map((entry) => renderEntry(entry))}
      {visibleLowerList.map((entry) => renderEntry(entry))}
      {hasLower && (
        <div ref={lowerObserverTarget} className="flex justify-center py-2 text-sm text-gray-400">
          {isFetchingNextPage ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          ) : (
            '···'
          )}
        </div>
      )}

      {/* Tailwind 기본 색상으로 표현하기 어려운 연한 하단 안내 배경 */}
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

function createRankSet(entries: RankingEntry[]): Set<number> {
  return new Set(entries.map((entry) => entry.rank));
}

function isElementVisible(target: HTMLElement, scrollContainer: HTMLElement): boolean {
  const targetRect = target.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  return targetRect.bottom >= containerRect.top && targetRect.top <= containerRect.bottom;
}

function mergeRankingEntries(entries: RankingEntry[]): RankingEntry[] {
  const rankingByRank = new Map<number, RankingEntry>();

  entries.forEach((entry) => {
    if (!rankingByRank.has(entry.rank)) {
      rankingByRank.set(entry.rank, entry);
    }
  });

  return [...rankingByRank.values()].sort((a, b) => a.rank - b.rank);
}
