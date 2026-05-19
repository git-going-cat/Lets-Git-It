import { useId, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useCoopMaps } from '@/features/multi/hooks/useRoom';
import { useModal } from '@/shared/hooks/useModal';

import { useRanking } from '../hooks/useRanking';
import { isInitialRankingPage } from '../utils/rankingEntries';
import {
  getCurrentWeek,
  getModeLabel,
  getPrevWeek,
  normalizeWeekParam,
} from '../utils/rankingFormat';
import { rankingQueryKey } from '../utils/rankingQueryKey';
import { getCachedSingleWeekInfo } from '../utils/rankingWeekCache';

import RankingList from './RankingList';
import RankingPodium from './RankingPodium';
import RankingSidebar from './RankingSidebar';

import type { CoopRankingQuery, RankingMode, WeekParam } from '../types/ranking.types';
import type { CoopMap } from '@/features/multi/types/room.types';

interface RankingModalProps {
  onClose: () => void;
}

function toCoopQuery(map: CoopMap): CoopRankingQuery {
  return {
    mapId: map.mapId,
    mapName: map.mapName,
    difficulty: map.difficulty,
  };
}

function getDefaultCoopMap(maps: CoopMap[]) {
  return maps.find((map) => map.difficulty === 1) ?? maps[0];
}

export default function RankingModal({ onClose }: RankingModalProps) {
  const { containerRef } = useModal({ isOpen: true, onClose });
  const titleId = useId();

  const [activeMode, setActiveMode] = useState<RankingMode>('single-easy');
  const [selectedWeek, setSelectedWeek] = useState<WeekParam | null>(null);
  const [selectedCoopQuery, setSelectedCoopQuery] = useState<CoopRankingQuery | undefined>();
  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const isCoopMode = activeMode === 'coop';
  const { data: coopMapData } = useCoopMaps(isCoopMode);
  const coopMaps = useMemo(() => coopMapData?.maps ?? [], [coopMapData]);
  const activeCoopQuery = useMemo<CoopRankingQuery | undefined>(() => {
    if (!isCoopMode) return undefined;

    const selectedMap = coopMaps.find((map) => map.mapId === selectedCoopQuery?.mapId);
    if (selectedMap) return toCoopQuery(selectedMap);

    const defaultMap = getDefaultCoopMap(coopMaps);
    if (!defaultMap) return undefined;

    return toCoopQuery(defaultMap);
  }, [coopMaps, isCoopMode, selectedCoopQuery?.mapId]);

  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = useRanking(activeMode, selectedWeek, activeCoopQuery);

  const isCurrentWeek = selectedWeek === null;
  const shouldShowPreparingGuide = activeMode === 'timeattack';

  const currentWeekInfo = useMemo<WeekParam | null>(() => {
    if (shouldShowPreparingGuide || !isCurrentWeek || !data) return null;
    const page = data.pages.find((rankingPage) => 'year' in rankingPage);
    if (page && 'year' in page && 'month' in page && 'week' in page) {
      return normalizeWeekParam({ year: page.year, month: page.month, week: page.week });
    }
    return null;
  }, [data, isCurrentWeek, shouldShowPreparingGuide]);

  const cachedSingleWeekInfo = useMemo(() => {
    void activeMode;
    void data;
    return getCachedSingleWeekInfo(queryClient);
  }, [queryClient, activeMode, data]);
  const fallbackCurrentWeek = useMemo(() => getCurrentWeek(), []);
  const displayWeek =
    selectedWeek ?? currentWeekInfo ?? cachedSingleWeekInfo ?? fallbackCurrentWeek;
  const rankingListKey = `${activeMode}:${activeCoopQuery?.mapId ?? ''}:${selectedWeek?.year ?? 'current'}:${
    selectedWeek?.month ?? ''
  }:${selectedWeek?.week ?? ''}`;

  const handleModeChange = (mode: RankingMode) => {
    if (mode === activeMode) return;

    queryClient.removeQueries({
      queryKey: rankingQueryKey(mode, null),
      exact: true,
    });
    setActiveMode(mode);
    setSelectedWeek(null);
  };

  const handleSelectCoopMap = (mapId: string) => {
    const map = coopMaps.find((coopMap) => coopMap.mapId === mapId);
    if (!map) return;
    setSelectedCoopQuery(toCoopQuery(map));
    setSelectedWeek(null);
  };

  const handlePrevWeek = () => {
    if (!currentWeekInfo || !isCurrentWeek) return;
    setSelectedWeek(getPrevWeek(currentWeekInfo));
  };

  const handleNextWeek = () => {
    setSelectedWeek(null);
  };

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
              aria-label="랭킹 모달 닫기"
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 px-6 pb-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={!isCurrentWeek || !currentWeekInfo || shouldShowPreparingGuide}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="이전 주"
            >
              ‹
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
              ›
            </button>
          </div>

          <div className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden rounded-xl bg-[rgba(255,255,255,0.72)] shadow-lg backdrop-blur-md">
            {shouldShowPreparingGuide ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                {getModeLabel(activeMode)} 랭킹은 준비 중입니다.
              </div>
            ) : isCoopMode && !activeCoopQuery ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                협력 맵을 선택해 주세요.
              </div>
            ) : isLoading && !data ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
              </div>
            ) : data?.pages.find(isInitialRankingPage) ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <RankingPodium
                  mode={activeMode}
                  top3={data.pages.find(isInitialRankingPage)?.top3 ?? []}
                />
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
                    coopMaps={coopMaps}
                    activeCoopQuery={activeCoopQuery}
                    onSelectCoopMap={handleSelectCoopMap}
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
