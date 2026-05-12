import { useId, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useModal } from '@/shared/hooks/useModal';

import { useRanking } from '../hooks/useRanking';
import { isInitialRankingPage } from '../utils/rankingEntries';
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

import type { RankingMode, WeekParam } from '../types/ranking.types';

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
  const rankingScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
  } = useRanking(activeMode, selectedWeek);

  const isCurrentWeek = selectedWeek === null;
  const shouldShowPreparingGuide =
    activeMode === 'single-hard' || !activeMode.startsWith('single-');

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
  const cachedSingleWeekInfo = useMemo(() => getCachedSingleWeekInfo(queryClient), [queryClient]);
  const fallbackCurrentWeek = useMemo(() => getCurrentWeek(), []);
  const displayWeek =
    selectedWeek ??
    (shouldShowPreparingGuide ? (cachedSingleWeekInfo ?? fallbackCurrentWeek) : currentWeekInfo);
  const rankingListKey = `${activeMode}:${selectedWeek?.year ?? 'current'}:${selectedWeek?.month ?? ''}:${
    selectedWeek?.week ?? ''
  }`;

  const handleModeChange = (mode: RankingMode) => {
    setActiveMode(mode);
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
            {shouldShowPreparingGuide ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                {getModeLabel(activeMode)} 랭킹은 준비 중입니다.
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
