import { useState } from 'react';

import { useRanking } from '../hooks/useRanking';
import RankingList from './RankingList';
import RankingPodium from './RankingPodium';
import RankingSidebar from './RankingSidebar';

import type { RankingEntry, RankingMode } from '../types/ranking.types';

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
 */
export default function RankingModal({ onClose }: RankingModalProps) {
  const [activeMode, setActiveMode] = useState<RankingMode>('single-easy');
  const { data, isLoading } = useRanking(activeMode);

  // useInfiniteQuery 응답에서 초기 데이터(top3, myRank 등) 추출
  const initialData = data?.pages[0] && 'top3' in data.pages[0] ? data.pages[0] : null;

  const handleModeChange = (mode: RankingMode) => {
    setActiveMode(mode);
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
          background: 'linear-gradient(160deg, #7ECFEA 0%, #9DDAF0 35%, #C5EDF8 65%, #E8C4C4 100%)'
        }}
      >
        {/* 좌측 사이드바 */}
        <RankingSidebar activeMode={activeMode} onSelectMode={handleModeChange} />

        {/* 우측 콘텐츠 영역 */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* 헤더 바 */}
          <div className="flex items-center justify-between px-6 py-3">
            <h2 className="text-lg font-bold text-gray-800">
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

          {/* 주간 정보 */}
          {initialData && (
            <div className="px-6 pb-2">
              {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
              <span
                className="inline-block"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  color: '#5a7ab0',
                  border: '1px solid rgba(100,140,200,0.25)',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '11px',
                }}
              >
                {initialData.year}년 {initialData.month}월 {initialData.week}주차
              </span>
            </div>
          )}

          {/* 콘텐츠 */}
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
              <div className="flex flex-1 flex-col overflow-y-auto">
                <RankingPodium
                  mode={activeMode}
                  top3={initialData.top3 as RankingEntry[]}
                />
                <RankingList
                  mode={activeMode}
                  data={data}
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

// ── 헬퍼 ──────────────────────────────────────────────────

/** 모드 코드를 한글 라벨로 변환 */
function getModeLabel(mode: RankingMode): string {
  const labels: Record<RankingMode, string> = {
    'single-easy': '싱글 이지',
    'single-normal': '싱글 노말',
    'single-hard': '싱글 하드',
    speed: '기여도 뺏기',
    timeattack: '타임어택',
    coop: '협력',
  };
  return labels[mode];
}
