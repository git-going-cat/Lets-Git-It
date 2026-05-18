import { useId, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useCoopMaps } from '@/features/multi/hooks/useRoom';
import { useModal } from '@/shared/hooks/useModal';

import { useRanking } from '../hooks/useRanking';
import { formatCoopDifficulty } from '../utils/coopDifficulty';
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

// ── 타입 ──────────────────────────────────────────────────

interface RankingModalProps {
  onClose: () => void;
}

// ── 컴포넌트 ──────────────────────────────────────────────

/**
 * 랭킹 모달 — 사이드바 + 콘텐츠(TOP3 시상대 + 순위 리스트)
 *
 * @description 좌측 폴더트리로 모드 선택, 우측에 해당 모드의 랭킹 표시.
 *              TanStack Query로 데이터 조회, 서버 상태 별도 store 저장 없음.
 *              selectedWeek=null → 이번 주 API, 값 있음 → 직전 주 history API (2단계).
 */
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
  } = useCoopMaps(isCoopMode);
  const coopMaps = useMemo(() => coopMapData?.maps ?? [], [coopMapData]);
  const activeCoopQuery = useMemo<CoopRankingQuery | undefined>(() => {
    if (!isCoopMode) return undefined;

    const selectedMap = coopMaps.find((map) => map.mapId === selectedCoopQuery?.mapId);
    if (selectedMap) {
      return {
        mapId: selectedMap.mapId,
        mapName: selectedMap.mapName,
        difficulty: selectedMap.difficulty,
      };
    }

    const firstMap = coopMaps[0];
    if (!firstMap) return undefined;

    return {
      mapId: firstMap.mapId,
      mapName: firstMap.mapName,
      difficulty: firstMap.difficulty,
    };
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

  // 이번 주 API 응답에서 파생 — history 조회 중에는 null (displayWeek는 selectedWeek 우선)
  const currentWeekInfo = useMemo<WeekParam | null>(() => {
    if (shouldShowPreparingGuide || !isCurrentWeek || !data) return null;
    const page = data.pages.find((rankingPage) => 'year' in rankingPage);
    if (page && 'year' in page && 'month' in page && 'week' in page) {
      return normalizeWeekParam({ year: page.year, month: page.month, week: page.week });
    }
    return null;
  }, [data, isCurrentWeek, shouldShowPreparingGuide]);

  const initialData = data?.pages.find(isInitialRankingPage) ?? null;
  const cachedSingleWeekInfo = useMemo(() => {
    // activeMode/data 변경 시 싱글 랭킹 캐시를 다시 훑어 최신 주차 fallback을 유지합니다.
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

  const handleSelectCoopMap = (map: CoopMap) => {
    setSelectedCoopQuery({
      mapId: map.mapId,
      mapName: map.mapName,
      difficulty: map.difficulty,
    });
    setSelectedWeek(null);
  };

  // ← 이번 주 → 직전 주 (2단계만 허용)
  const handlePrevWeek = () => {
    if (!currentWeekInfo || !isCurrentWeek) return;
    setSelectedWeek(getPrevWeek(currentWeekInfo));
  };

  // → 항상 이번 주로 복귀
  const handleNextWeek = () => {
    setSelectedWeek(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 본체 */}
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex h-ranking-modal w-modal-lg overflow-hidden rounded-ranking-modal bg-[linear-gradient(160deg,#7ECFEA_0%,#9DDAF0_35%,#C5EDF8_65%,#E8C4C4_100%)] shadow-2xl"
      >
        {/* 좌측 사이드바 */}
        <RankingSidebar activeMode={activeMode} onSelectMode={handleModeChange} />

        {/* 중앙 콘텐츠 영역 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 헤더 바 */}
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
              ✕
            </button>
          </div>

          {/* 주간 네비게이터 — 이번 주 ↔ 직전 주 2단계 */}
          <div className="flex items-center justify-center gap-3 px-6 pb-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={!isCurrentWeek || !currentWeekInfo || shouldShowPreparingGuide}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="직전 주"
            >
              ←
            </button>
            {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
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
              →
            </button>
          </div>

          {/* 콘텐츠 카드 */}
          {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
          <div className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden rounded-xl bg-[rgba(255,255,255,0.72)] shadow-lg backdrop-blur-md">
            {isCoopMode && (
              /* Tailwind 기본 색상 토큰으로 표현하기 어려운 랭킹 모달 반투명 경계선 */
              <div className="border-b border-b-[rgba(100,140,200,0.12)] px-4 py-3">
                {isCoopMapLoading ? (
                  <p className="text-sm text-gray-500">협력 맵을 불러오는 중...</p>
                ) : isCoopMapError ? (
                  <p className="text-sm text-red-500">협력 맵 목록을 불러오지 못했습니다.</p>
                ) : coopMaps.length === 0 ? (
                  <p className="text-sm text-gray-500">선택 가능한 협력 맵이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {coopMaps.map((map) => {
                      const isSelected = activeCoopQuery?.mapId === map.mapId;

                      return (
                        /* Tailwind 기본 색상 토큰으로 표현하기 어려운 랭킹 모달 선택/hover 색상 */
                        <button
                          key={map.mapId}
                          type="button"
                          onClick={() => handleSelectCoopMap(map)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            isSelected
                              ? 'border-[#3a5a9a] bg-white font-semibold text-[#3a5a9a]'
                              : 'border-white/60 bg-white/45 text-gray-600 hover:bg-white/70'
                          }`}
                        >
                          <span className="block">{map.mapName}</span>
                          <span className="text-xs text-yellow-600">
                            {formatCoopDifficulty(map.difficulty)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
            ) : initialData ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <RankingPodium mode={activeMode} top3={initialData.top3} />
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
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                랭킹 데이터가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
