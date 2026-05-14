import { type RefObject, useCallback, useRef } from 'react';

import { useRankingListScroll } from '../hooks/useRankingListScroll';
import { createRankSet, isInitialRankingPage, mergeRankingEntries } from '../utils/rankingEntries';
import {
  formatPlayTime,
  formatScore,
  getGrade,
  getPlayTime,
  getValueLabel,
  GRADE_COLOR_CLASSES,
} from '../utils/rankingFormat';

import type { useRanking } from '../hooks/useRanking';
import type { RankingEntry, RankingMode } from '../types/ranking.types';

type RankingQueryResult = ReturnType<typeof useRanking>;
type RankingDirection = 'up' | 'down';

interface RankingListProps {
  mode: RankingMode;
  data: RankingQueryResult['data'];
  fetchNextPage: RankingQueryResult['fetchNextPage'];
  fetchPreviousPage: RankingQueryResult['fetchPreviousPage'];
  hasNextPage: RankingQueryResult['hasNextPage'];
  hasPreviousPage: RankingQueryResult['hasPreviousPage'];
  isFetching: boolean;
  isFetchingNextPage: RankingQueryResult['isFetchingNextPage'];
  isFetchingPreviousPage: RankingQueryResult['isFetchingPreviousPage'];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scrollResetKey: string;
}

export default function RankingList({
  mode,
  data,
  fetchNextPage,
  fetchPreviousPage,
  hasNextPage,
  hasPreviousPage,
  isFetching,
  isFetchingNextPage,
  isFetchingPreviousPage,
  scrollContainerRef,
  scrollResetKey,
}: RankingListProps) {
  const upperObserverTarget = useRef<HTMLDivElement>(null);
  const lowerObserverTarget = useRef<HTMLDivElement>(null);
  const hasScrolledToFocusRef = useRef(false);
  const suppressScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const previousScrollHeightRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<RankingDirection | null>(null);

  const initialPage = data?.pages.find(isInitialRankingPage);
  const initialPageIndex = initialPage && data ? data.pages.indexOf(initialPage) : -1;
  const around = mergeRankingEntries(initialPage?.around ?? []);
  const myRank = initialPage?.myRank ?? null;
  const hasMyRankingWindow = myRank !== null || around.length > 0;
  const baseRankings = hasMyRankingWindow ? around : mergeRankingEntries(initialPage?.top3 ?? []);
  const myRankValue = myRank?.rank ?? null;
  const lastBaseRank = baseRankings[baseRankings.length - 1]?.rank ?? null;

  const valueLabel = getValueLabel(mode);
  const showGrade = mode !== 'coop';
  const visibleAround = baseRankings;
  const nextPageEntries = mergeRankingEntries(
    data?.pages.flatMap((page, index) => {
      if (index <= initialPageIndex || !('rankings' in page)) return [];
      return page.rankings;
    }) ?? []
  );
  const previousPageEntries = mergeRankingEntries(
    data?.pages.flatMap((page, index) => {
      if (index >= initialPageIndex || !('rankings' in page)) return [];
      return page.rankings;
    }) ?? []
  );
  const loadedRankSet = createRankSet(visibleAround);
  const visibleUpperList = previousPageEntries.filter((entry) => !loadedRankSet.has(entry.rank));
  const loadedUpperAndAroundRankSet = createRankSet([...visibleUpperList, ...visibleAround]);
  const visibleLowerList = nextPageEntries.filter(
    (entry) =>
      !loadedUpperAndAroundRankSet.has(entry.rank) &&
      (lastBaseRank === null || entry.rank > lastBaseRank)
  );
  const focusRank = myRankValue;
  const hasUpper = Boolean(hasPreviousPage);
  const hasLower = Boolean(hasNextPage);
  const shouldPreloadLowerRankings =
    !isFetching &&
    myRank === null &&
    baseRankings.length > 0 &&
    nextPageEntries.length === 0 &&
    hasNextPage;

  const loadUpperRankings = useCallback(() => {
    if (isFetching || isFetchingPreviousPage) return;
    previousScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? null;
    void fetchPreviousPage();
  }, [fetchPreviousPage, isFetching, isFetchingPreviousPage, scrollContainerRef]);

  const loadLowerRankings = useCallback(() => {
    if (isFetching || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, isFetching, isFetchingNextPage]);

  const focusTargetCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (!scrollResetKey || !node || hasScrolledToFocusRef.current || !scrollContainerRef.current)
        return;

      suppressScrollRef.current = true;
      node.scrollIntoView({ behavior: 'instant', block: 'center' });
      lastScrollTopRef.current = scrollContainerRef.current.scrollTop;
      hasScrolledToFocusRef.current = true;
      requestAnimationFrame(() => {
        suppressScrollRef.current = false;
      });
    },
    [scrollContainerRef, scrollResetKey]
  );

  useRankingListScroll({
    scrollContainerRef,
    upperObserverTarget,
    lowerObserverTarget,
    lastScrollTopRef,
    previousScrollHeightRef,
    scrollDirectionRef,
    suppressScrollRef,
    hasUpper,
    hasLower,
    visibleUpperListLength: visibleUpperList.length,
    shouldPreloadLowerRankings,
    loadUpperRankings,
    loadLowerRankings,
  });

  if (!data) return null;

  const renderEntry = (entry: RankingEntry) => {
    const isMe = myRankValue !== null && entry.rank === myRankValue;
    const shouldFocusEntry = focusRank !== null && entry.rank === focusRank;
    const grade = getGrade(mode, entry);
    const playTime = getPlayTime(entry);
    const shouldShowPlayTime = mode.startsWith('single-');

    return (
      <div key={entry.rank} ref={shouldFocusEntry ? focusTargetCallback : undefined}>
        <div
          className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
            isMe
              ? 'border-y border-y-[rgba(5,175,242,0.3)] bg-[rgba(5,175,242,0.1)] font-medium text-[#0078D4]'
              : 'border-b border-b-[rgba(100,140,200,0.07)] text-gray-700'
          }`}
        >
          <span className="w-12 text-center font-bold">{entry.rank}</span>
          <span className="flex flex-1 items-center gap-1.5">
            {entry.nickname}
            {isMe && (
              <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-xs font-bold text-white">
                ME
              </span>
            )}
          </span>
          <span className="w-24 text-right font-semibold">{formatScore(mode, entry)}</span>
          {shouldShowPlayTime && (
            <span className="w-24 text-right text-xs font-medium text-gray-500">
              {formatPlayTime(playTime)}
            </span>
          )}
          {showGrade && (
            <span className="flex w-14 justify-center">
              {grade && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${GRADE_COLOR_CLASSES[grade]}`}
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
      <div className="flex items-center bg-[rgba(100,140,200,0.07)] px-4 py-2 text-xs font-semibold text-[#7a8aaa]">
        <span className="w-12 text-center">순위</span>
        <span className="flex-1">닉네임</span>
        <span className="w-24 text-right">{valueLabel}</span>
        {mode.startsWith('single-') && <span className="w-24 text-right">플레이 시간</span>}
        {showGrade && <span className="w-14 text-center">등급</span>}
      </div>

      {hasUpper && (
        <div ref={upperObserverTarget} className="flex justify-center py-2 text-sm text-gray-400">
          {isFetchingPreviousPage ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          ) : (
            '이전 순위 더 보기'
          )}
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
            '아래 순위 더 보기'
          )}
        </div>
      )}

      <div className="border-t border-t-[rgba(100,140,200,0.1)] bg-[rgba(100,140,200,0.05)] px-4 py-2 text-center text-xs text-[#9aaac8]">
        매주 월요일 00:00 초기화
      </div>
    </div>
  );
}
