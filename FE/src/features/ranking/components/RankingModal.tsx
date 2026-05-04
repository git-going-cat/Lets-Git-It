import { useMemo, useRef, useState } from 'react';

import { useRanking } from '../hooks/useRanking';
import { getModeLabel, getPrevWeek } from '../utils/rankingFormat';

import RankingList from './RankingList';
import RankingPodium from './RankingPodium';
import RankingSidebar from './RankingSidebar';

import type { RankingEntry, RankingMode, WeekParam } from '../types/ranking.types';

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
  const [activeMode, setActiveMode] = useState<RankingMode>('single-easy');
  const [selectedWeek, setSelectedWeek] = useState<WeekParam | null>(null);
  const rankingScrollRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useRanking(
    activeMode,
    selectedWeek
  );

  const isCurrentWeek = selectedWeek === null;

  // 이번 주 API 응답에서 파생 — history 조회 중에는 null (displayWeek는 selectedWeek 우선)
  const currentWeekInfo = useMemo<WeekParam | null>(() => {
    if (!isCurrentWeek || !data?.pages[0]) return null;
    const page = data.pages[0];
    if ('year' in page && 'month' in page && 'week' in page) {
      return { year: page.year, month: page.month, week: page.week };
    }
    return null;
  }, [data, isCurrentWeek]);

  const initialData = data?.pages[0] && 'top3' in data.pages[0] ? data.pages[0] : null;
  const displayWeek = selectedWeek ?? currentWeekInfo;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="랭킹"
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 본체 */}
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <div
        className="relative z-10 flex w-modal-lg overflow-hidden shadow-2xl"
        style={{
          borderRadius: '16px',
          height: '600px',
          background: 'linear-gradient(160deg, #7ECFEA 0%, #9DDAF0 35%, #C5EDF8 65%, #E8C4C4 100%)',
        }}
      >
        {/* 좌측 사이드바 */}
        <RankingSidebar activeMode={activeMode} onSelectMode={handleModeChange} />

        {/* 중앙 콘텐츠 영역 */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* 헤더 바 */}
          <div className="flex items-center justify-between px-6 py-3">
            <h2 className="text-lg font-bold text-gray-800">{getModeLabel(activeMode)} 랭킹</h2>
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
              disabled={!isCurrentWeek || !currentWeekInfo}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-gray-600 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="직전 주"
            >
              ←
            </button>
            {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
            <span className="text-lg font-semibold" style={{ color: '#3a5a8a' }}>
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
          <div
            className="mx-4 mb-4 flex flex-1 flex-col overflow-hidden rounded-xl shadow-lg backdrop-blur-md"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)' }}
          >
            {isLoading && !data ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
              </div>
            ) : initialData ? (
              <div ref={rankingScrollRef} className="flex flex-1 flex-col overflow-y-auto">
                <RankingPodium mode={activeMode} top3={initialData.top3 as RankingEntry[]} />
                <RankingList
                  key={rankingListKey}
                  mode={activeMode}
                  data={data}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  scrollContainerRef={rankingScrollRef}
                  scrollResetKey={rankingListKey}
                  selectedWeek={selectedWeek}
                />
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
