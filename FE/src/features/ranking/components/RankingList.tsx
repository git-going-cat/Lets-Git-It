import { type RefObject, useCallback, useRef } from 'react';

import { useRankingListScroll } from '../hooks/useRankingListScroll';
import { formatCoopDifficulty } from '../utils/coopDifficulty';
import { createRankSet, isInitialRankingPage, mergeRankingEntries } from '../utils/rankingEntries';
import {
  formatClearTime,
  formatPlayTime,
  formatScore,
  getGrade,
  getPlayTime,
  getValueLabel,
  GRADE_COLOR_CLASSES,
} from '../utils/rankingFormat';

import type { useRanking } from '../hooks/useRanking';
import type {
  CoopRankingEntry,
  CoopRankingQuery,
  RankingEntry,
  RankingMode,
} from '../types/ranking.types';
import type { CoopMap } from '@/features/multi/types/room.types';

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
  coopMaps?: CoopMap[];
  activeCoopQuery?: CoopRankingQuery;
  onSelectCoopMap?: (mapId: string) => void;
}

function isCoopEntry(entry: RankingEntry): entry is CoopRankingEntry {
  return 'clearTime' in entry && 'difficulty' in entry;
}

function getCoopTitle(entry: CoopRankingEntry) {
  return entry.teamName ?? entry.nickname ?? '-';
}

function formatMembers(entry: CoopRankingEntry) {
  if (!entry.members || entry.members.length === 0) return '-';
  return [...entry.members].sort((a, b) => a.localeCompare(b, 'ko-KR')).join(', ');
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
  coopMaps = [],
  activeCoopQuery,
  onSelectCoopMap,
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
    !isFetchingNextPage &&
    myRank === null &&
    baseRankings.length > 0 &&
    nextPageEntries.length === 0 &&
    hasNextPage;

  const loadUpperRankings = useCallback(() => {
    if (!hasPreviousPage || isFetching || isFetchingPreviousPage) return;
    previousScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? null;
    void fetchPreviousPage();
  }, [fetchPreviousPage, hasPreviousPage, isFetching, isFetchingPreviousPage, scrollContainerRef]);

  const loadLowerRankings = useCallback(() => {
    if (!hasNextPage || isFetching || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetching, isFetchingNextPage]);

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

    if (mode === 'coop' && isCoopEntry(entry)) {
      return (
        <div key={entry.rank} ref={shouldFocusEntry ? focusTargetCallback : undefined}>
          <div
            className={`grid grid-cols-[3rem_minmax(10rem,1fr)_3.5rem_3.5rem_6rem_minmax(8rem,1fr)] items-center gap-1 px-4 py-2.5 text-sm transition-colors ${
              isMe
                ? 'border-y border-y-[rgba(5,175,242,0.3)] bg-[rgba(5,175,242,0.1)] font-medium text-[#0078D4]'
                : 'border-b border-b-[rgba(100,140,200,0.07)] text-gray-700'
            }`}
          >
            <span className="text-center font-bold">{entry.rank}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{getCoopTitle(entry)}</span>
              <span className="block truncate text-xs text-gray-600">{formatMembers(entry)}</span>
            </span>
            <span className="text-right tabular-nums">{entry.wrongTypeCount ?? 0}</span>
            <span className="text-right tabular-nums">{entry.wrongOrderCount ?? 0}</span>
            <span className="text-right font-semibold">{formatClearTime(entry.clearTime)}</span>
            <span className="truncate text-right text-xs text-gray-500">
              {entry.mapName ?? `난이도 ${entry.difficulty}`}
            </span>
          </div>
        </div>
      );
    }

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
            {'nickname' in entry ? entry.nickname : '-'}
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
      {mode === 'coop' ? (
        <div className="grid grid-cols-[3rem_minmax(10rem,1fr)_3.5rem_3.5rem_6rem_minmax(8rem,1fr)] items-center gap-1 bg-[rgba(100,140,200,0.07)] px-4 py-2 text-xs font-semibold text-[#7a8aaa]">
          <span className="text-center">순위</span>
          <span>팀명 / 팀원</span>
          <span className="text-right">오타</span>
          <span className="text-right">리셋</span>
          <span className="text-right">소요 시간</span>
          <span className="flex justify-end">
            {coopMaps.length > 0 && onSelectCoopMap ? (
              <select
                value={activeCoopQuery?.mapId ?? ''}
                onChange={(event) => onSelectCoopMap(event.target.value)}
                className="max-w-full rounded border border-white/70 bg-white/70 px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#3a5a9a]"
                aria-label="협력 랭킹 맵 선택"
              >
                {coopMaps.map((map) => (
                  <option key={map.mapId} value={map.mapId}>
                    {map.mapName} {formatCoopDifficulty(map.difficulty)}
                  </option>
                ))}
              </select>
            ) : (
              '맵'
            )}
          </span>
        </div>
      ) : (
        <div className="flex items-center bg-[rgba(100,140,200,0.07)] px-4 py-2 text-xs font-semibold text-[#7a8aaa]">
          <span className="w-12 text-center">순위</span>
          <span className="flex-1">닉네임</span>
          <span className="w-24 text-right">{valueLabel}</span>
          {mode.startsWith('single-') && <span className="w-24 text-right">플레이 시간</span>}
          {showGrade && <span className="w-14 text-center">등급</span>}
        </div>
      )}

      {hasUpper && (
        <div ref={upperObserverTarget} className="flex justify-center py-2 text-sm text-gray-400">
          {isFetchingPreviousPage && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          )}
        </div>
      )}
      {visibleUpperList.map((entry) => renderEntry(entry))}
      {visibleAround.map((entry) => renderEntry(entry))}
      {visibleLowerList.map((entry) => renderEntry(entry))}
      {hasLower && (
        <div ref={lowerObserverTarget} className="flex justify-center py-2 text-sm text-gray-400">
          {isFetchingNextPage && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          )}
        </div>
      )}

      <div className="border-t border-t-[rgba(100,140,200,0.1)] bg-[rgba(100,140,200,0.05)] px-4 py-2 text-center text-xs text-[#9aaac8]">
        매주 월요일 00:00 초기화
      </div>
    </div>
  );
}
