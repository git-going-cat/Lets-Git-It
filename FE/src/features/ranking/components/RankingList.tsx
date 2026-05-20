import { type RefObject, useCallback, useRef } from 'react';

import { useRankingListScroll } from '../hooks/useRankingListScroll';
import {
  createRankSet,
  getRankingEntryKey,
  isInitialRankingPage,
  mergeRankingEntries,
} from '../utils/rankingEntries';
import {
  formatCoopMembers,
  formatPlayTime,
  formatScore,
  getGrade,
  getNameLabel,
  getPlayTime,
  getValueLabel,
  GRADE_COLOR_CLASSES,
} from '../utils/rankingFormat';

import type { useRanking } from '../hooks/useRanking';
import type {
  CoopRankingEntry,
  CoopRankingMap,
  MyRank,
  RankingEntry,
  RankingMode,
} from '../types/ranking.types';

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
  coopMaps?: CoopRankingMap[];
  selectedCoopMapId?: string;
  onCoopMapChange?: (map: CoopRankingMap) => void;
}

type FilterableRankingEntry = RankingEntry | Exclude<MyRank, null>;

function isCoopEntry(entry: FilterableRankingEntry): entry is CoopRankingEntry {
  return 'members' in entry && 'mapName' in entry && 'difficulty' in entry;
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
  selectedCoopMapId,
  onCoopMapChange,
}: RankingListProps) {
  const upperObserverTarget = useRef<HTMLDivElement>(null);
  const lowerObserverTarget = useRef<HTMLDivElement>(null);
  const mapDropdownRef = useRef<HTMLDetailsElement>(null);
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
  const top3 = mergeRankingEntries(initialPage?.top3 ?? []);
  const baseRankings = hasMyRankingWindow ? around : top3;
  const myRankValue = myRank?.rank ?? null;
  const lastBaseRank = baseRankings[baseRankings.length - 1]?.rank ?? null;

  const valueLabel = getValueLabel(mode);
  const nameLabel = getNameLabel(mode);
  const showMapColumn = mode === 'coop';
  const showCoopWrongColumns = mode === 'coop';
  const showGrade = mode !== 'coop';
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
  const loadedRankSet = createRankSet(baseRankings);
  const visibleUpperList = previousPageEntries.filter(
    (entry) => !loadedRankSet.has(getRankingEntryKey(entry))
  );
  const loadedUpperAndAroundRankSet = createRankSet([...visibleUpperList, ...baseRankings]);
  const visibleLowerList = nextPageEntries.filter(
    (entry) =>
      !loadedUpperAndAroundRankSet.has(getRankingEntryKey(entry)) &&
      (lastBaseRank === null || entry.rank > lastBaseRank)
  );
  const focusRank = myRankValue;
  const hasUpper = Boolean(hasPreviousPage);
  const hasLower = Boolean(hasNextPage);
  const visibleEntries = [...visibleUpperList, ...baseRankings, ...visibleLowerList];
  const shouldPreloadLowerRankings =
    hasLower && !isFetching && !isFetchingNextPage && visibleEntries.length > 0;

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
    visibleListLength: visibleEntries.length,
    shouldPreloadLowerRankings,
    isFetchingNextPage,
    isFetchingPreviousPage,
    loadUpperRankings,
    loadLowerRankings,
  });

  if (!data) return null;

  const getEntryName = (entry: RankingEntry) =>
    'teamName' in entry ? entry.teamName : entry.nickname;

  const renderEntryDetail = (entry: RankingEntry) => {
    if (mode === 'coop' && isCoopEntry(entry)) return `팀원 ${formatCoopMembers(entry)}`;
    if (mode === 'speed' && 'playCount' in entry) {
      return `플레이 ${entry.playCount.toLocaleString()}회`;
    }
    return null;
  };

  const renderEntry = (entry: RankingEntry) => {
    const isMe = myRankValue !== null && entry.rank === myRankValue;
    const shouldFocusEntry = focusRank !== null && entry.rank === focusRank;
    const grade = getGrade(mode, entry);
    const playTime = getPlayTime(entry);
    const shouldShowPlayTime = mode.startsWith('single-');
    const detail = renderEntryDetail(entry);

    return (
      <div key={getRankingEntryKey(entry)} ref={shouldFocusEntry ? focusTargetCallback : undefined}>
        <div
          className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
            isMe
              ? 'border-y border-y-[rgba(5,175,242,0.3)] bg-[rgba(5,175,242,0.1)] font-medium text-[#0078D4]'
              : 'border-b border-b-[rgba(100,140,200,0.07)] text-gray-700'
          }`}
        >
          <span className="w-12 text-center font-bold">{entry.rank}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5">
              {getEntryName(entry)}
              {isMe && (
                <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-xs font-bold text-white">
                  ME
                </span>
              )}
            </span>
            {detail && <span className="truncate text-xs text-gray-500">{detail}</span>}
          </span>
          {showMapColumn && (
            <span className="w-28 truncate text-right text-xs font-medium text-gray-500">
              {isCoopEntry(entry) ? entry.mapName : '-'}
            </span>
          )}
          {showCoopWrongColumns && (
            <>
              <span className="w-12 text-right text-xs font-semibold text-gray-600">
                {isCoopEntry(entry) ? entry.totalWrongTypeCount.toLocaleString() : '-'}
              </span>
              <span className="w-12 text-right text-xs font-semibold text-gray-600">
                {isCoopEntry(entry) ? entry.totalWrongOrderCount.toLocaleString() : '-'}
              </span>
            </>
          )}
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

  const selectedMap = coopMaps.find((map) => map.mapId === selectedCoopMapId);
  const selectedMapLabel = selectedMap
    ? `${selectedMap.mapName} ${'★'.repeat(Math.min(5, Math.max(1, selectedMap.difficulty)))}`
    : '맵 선택';

  return (
    <div className="flex flex-col">
      <div className="flex items-center bg-[rgba(100,140,200,0.07)] px-4 py-2 text-xs font-semibold text-[#7a8aaa]">
        <span className="w-12 text-center">순위</span>
        <span className="flex-1">{nameLabel}</span>
        {showMapColumn && (
          <span className="relative flex w-28 justify-end">
            <details ref={mapDropdownRef}>
              <summary className="flex cursor-pointer list-none items-center justify-end gap-1 rounded px-1 py-0.5 text-right hover:bg-white/70">
                <span>맵</span>
                <span className="max-w-20 truncate text-[10px] font-medium text-[#05AFF2]">
                  {selectedMapLabel}
                </span>
              </summary>
              <div className="absolute right-0 top-6 z-20 flex max-h-56 w-48 flex-col gap-1 overflow-y-auto rounded-lg border border-[rgba(100,140,200,0.2)] bg-white p-2 text-left shadow-lg">
                {coopMaps.map((map) => (
                  <button
                    key={map.mapId}
                    type="button"
                    onClick={() => {
                      onCoopMapChange?.(map);
                      if (mapDropdownRef.current) mapDropdownRef.current.open = false;
                    }}
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      selectedCoopMapId === map.mapId
                        ? 'bg-[#05AFF2] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="block truncate">{map.mapName}</span>
                    <span className="text-[10px] text-yellow-600">
                      {'★'.repeat(Math.min(5, Math.max(1, map.difficulty)))}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          </span>
        )}
        {showCoopWrongColumns && (
          <>
            <span className="w-12 text-right">오타</span>
            <span className="w-12 text-right">리셋</span>
          </>
        )}
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
      {visibleEntries.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          현재 불러온 랭킹에 해당 조건의 기록이 없습니다.
        </div>
      ) : (
        visibleEntries.map((entry) => renderEntry(entry))
      )}
      {hasLower && (
        <div
          ref={lowerObserverTarget}
          className="flex min-h-2 justify-center py-1 text-sm text-gray-400"
        >
          {isFetchingNextPage ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          ) : null}
        </div>
      )}

      <div className="border-t border-t-[rgba(100,140,200,0.1)] bg-[rgba(100,140,200,0.05)] px-4 py-2 text-center text-xs text-[#9aaac8]">
        현재 불러온 랭킹 내에서 표시합니다. 매주 월요일 00:00 기준으로 갱신합니다.
      </div>
    </div>
  );
}
