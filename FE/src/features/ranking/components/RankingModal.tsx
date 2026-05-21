import { useId, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useModal } from '@/shared/hooks/useModal';

import { useCoopRankingMaps } from '../hooks/useCoopRankingMaps';
import { useRanking } from '../hooks/useRanking';
import { isInitialRankingPage, mergeRankingEntries } from '../utils/rankingEntries';
import {
  getCurrentWeek,
  getModeLabel,
  getPrevWeek,
  normalizeWeekParam,
} from '../utils/rankingFormat';
import { getCachedSingleWeekInfo } from '../utils/rankingWeekCache';

import RankingList from './RankingList';
import RankingPodium from './RankingPodium';
import RankingSidebar from './RankingSidebar';

import type {
  CoopMyRank,
  CoopRankingEntry,
  CoopRankingMap,
  CoopRankingQuery,
  RankingMode,
  WeekParam,
} from '../types/ranking.types';

interface RankingModalProps {
  onClose: () => void;
}

function isCoopRankingItem(entry: unknown): entry is CoopRankingEntry | CoopMyRank {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'mapName' in entry &&
    'difficulty' in entry &&
    'members' in entry
  );
}

/** 랭킹 모드, 주차, TOP3와 순위 목록을 표시합니다. */
export default function RankingModal({ onClose }: RankingModalProps) {
  const { containerRef } = useModal({ isOpen: true, onClose });
  const titleId = useId();

  const [activeMode, setActiveMode] = useState<RankingMode>('single-easy');
  const [selectedWeek, setSelectedWeek] = useState<WeekParam | null>(null);
  const [selectedCoopQuery, setSelectedCoopQuery] = useState<CoopRankingQuery | undefined>();
  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const isCoopMode = activeMode === 'coop';
  const {
    data: coopMapData,
    isLoading: isCoopMapLoading,
    isError: isCoopMapError,
  } = useCoopRankingMaps(isCoopMode);
  const coopMaps = useMemo(() => coopMapData?.maps ?? [], [coopMapData]);
  const activeCoopQuery = useMemo<CoopRankingQuery | undefined>(() => {
    if (!isCoopMode) return undefined;

    const selectedMap = coopMaps.find((map) => map.mapId === selectedCoopQuery?.mapId);
    const fallbackMap = coopMaps.find((map) => map.isActive) ?? coopMaps[0];
    const map = selectedMap ?? fallbackMap;
    if (!map) return undefined;

    return {
      mapId: map.mapId,
      mapName: map.mapName,
      difficulty: map.difficulty,
    };
  }, [coopMaps, isCoopMode, selectedCoopQuery?.mapId]);

  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useRanking(activeMode, selectedWeek, activeCoopQuery);

  const isCurrentWeek = selectedWeek === null;
  const shouldShowPreparingGuide = activeMode === 'timeattack';

  const initialData = data?.pages.find(isInitialRankingPage) ?? null;
  const currentWeekInfo = useMemo<WeekParam | null>(() => {
    if (shouldShowPreparingGuide || !isCurrentWeek || !data) return null;
    const page = data.pages.find((rankingPage) => 'year' in rankingPage);
    if (page && 'year' in page && 'month' in page && 'week' in page) {
      return normalizeWeekParam({ year: page.year, month: page.month, week: page.week });
    }
    return null;
  }, [data, isCurrentWeek, shouldShowPreparingGuide]);

  const cachedSingleWeekInfo = getCachedSingleWeekInfo(queryClient);
  const fallbackCurrentWeek = useMemo(() => getCurrentWeek(), []);
  const displayWeek =
    selectedWeek ?? currentWeekInfo ?? cachedSingleWeekInfo ?? fallbackCurrentWeek;
  const rankingListKey = `${activeMode}:${selectedWeek?.year ?? 'current'}:${
    selectedWeek?.month ?? ''
  }:${selectedWeek?.week ?? ''}:${activeCoopQuery?.mapId ?? ''}`;

  const handleModeChange = (mode: RankingMode) => {
    if (mode === activeMode) return;

    queryClient.removeQueries({
      queryKey: ['ranking', mode, 'current'],
      exact: false,
    });
    setActiveMode(mode);
    setSelectedWeek(null);
  };

  const handleSelectCoopMap = (map: CoopRankingMap) => {
    setSelectedCoopQuery({
      mapId: map.mapId,
      mapName: map.mapName,
      difficulty: map.difficulty,
    });
    setSelectedWeek(null);
  };

  const handlePrevWeek = () => {
    if (!currentWeekInfo || !isCurrentWeek) return;
    setSelectedWeek(getPrevWeek(currentWeekInfo));
  };

  const handleNextWeek = () => {
    setSelectedWeek(null);
  };

  const filteredTop3 = initialData
    ? mergeRankingEntries(
        activeMode === 'coop'
          ? initialData.top3.filter((entry): entry is CoopRankingEntry => isCoopRankingItem(entry))
          : initialData.top3
      )
    : [];

  const errorMessage =
    error instanceof Error ? error.message : '랭킹 데이터를 불러오지 못했습니다.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex h-ranking-modal w-modal-lg overflow-hidden rounded-ranking-modal bg-[linear-gradient(160deg,#7ECFEA_0%,#9DDAF0_35%,#C5EDF8_65%,#E8C4C4_100%)] shadow-2xl"
      >
        <RankingSidebar activeMode={activeMode} onSelectMode={handleModeChange} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3">
            <h2 id={titleId} className="text-lg font-bold text-gray-800">
              {getModeLabel(activeMode)} 랭킹
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10"
              aria-label="닫기"
            >
              X
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 px-6 pb-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={!isCurrentWeek || !currentWeekInfo || shouldShowPreparingGuide}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="직전 주"
            >
              {'<'}
            </button>
            <span className="text-lg font-semibold text-[#3a5a8a]">
              {displayWeek
                ? `${displayWeek.year}년 ${displayWeek.month}월 ${displayWeek.week}주차`
                : '로딩 중...'}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              disabled={isCurrentWeek}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="이번 주"
            >
              {'>'}
            </button>
          </div>

          <div className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden rounded-xl bg-[rgba(255,255,255,0.72)] shadow-lg backdrop-blur-md">
            {shouldShowPreparingGuide ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                {getModeLabel(activeMode)} 랭킹은 준비 중입니다.
              </div>
            ) : isCoopMode && isCoopMapLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                협력 맵을 불러오는 중...
              </div>
            ) : isCoopMode && isCoopMapError ? (
              <div className="flex flex-1 items-center justify-center text-sm text-red-500">
                협력 맵 목록을 불러오지 못했습니다.
              </div>
            ) : isCoopMode && !activeCoopQuery ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                협력 맵을 선택해 주세요.
              </div>
            ) : isLoading && !data ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
              </div>
            ) : isError ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-red-500">
                {errorMessage}
              </div>
            ) : initialData ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <RankingPodium mode={activeMode} top3={filteredTop3} />
                <div ref={rankingScrollRef} className="flex-1 overflow-y-auto">
                  <RankingList
                    key={rankingListKey}
                    mode={activeMode}
                    data={data}
                    fetchNextPage={fetchNextPage}
                    fetchPreviousPage={fetchPreviousPage}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    isFetching={isFetching}
                    isFetchingNextPage={isFetchingNextPage}
                    isFetchingPreviousPage={isFetchingPreviousPage}
                    scrollContainerRef={rankingScrollRef}
                    scrollResetKey={rankingListKey}
                    coopMaps={activeMode === 'coop' ? coopMaps : undefined}
                    selectedCoopMapId={activeCoopQuery?.mapId}
                    onCoopMapChange={activeMode === 'coop' ? handleSelectCoopMap : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                랭킹 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
