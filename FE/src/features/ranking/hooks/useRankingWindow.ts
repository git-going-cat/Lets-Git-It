import { type RefObject, useCallback, useRef, useState } from 'react';

import { fetchRankingWindow } from '../api/rankingApi';

import type { RankingEntry, RankingMode, WeekParam } from '../types/ranking.types';

interface UseRankingWindowParams {
  mode: RankingMode;
  selectedWeek: WeekParam | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scrollResetKey: string;
  initialUpperCursor: number | null;
  initialLowerCursor: number | null;
  initialHasUpper: boolean;
  initialHasLower: boolean;
}

/**
 * 랭킹 리스트의 위/아래 방향 추가 로딩 상태와 API 호출을 관리한다.
 *
 * @description RankingList가 렌더링과 스크롤 감지만 담당하도록 window 랭킹 데이터,
 *              cursor, fetch 중복 방지 ref, 상단 삽입 보정 ref를 캡슐화한다.
 */
export function useRankingWindow({
  mode,
  selectedWeek,
  scrollContainerRef,
  scrollResetKey,
  initialUpperCursor,
  initialLowerCursor,
  initialHasUpper,
  initialHasLower,
}: UseRankingWindowParams) {
  const prevScrollHeightRef = useRef(0);
  const shouldAdjustUpperScrollRef = useRef(false);
  const isFetchingUpperRef = useRef(false);
  const isFetchingLowerRef = useRef(false);
  const resetSignature = `${scrollResetKey}:${initialUpperCursor ?? 'null'}:${initialLowerCursor ?? 'null'}:${initialHasUpper}:${initialHasLower}`;
  const [activeResetSignature, setActiveResetSignature] = useState(resetSignature);
  const [upperList, setUpperList] = useState<RankingEntry[]>([]);
  const [upperCursor, setUpperCursor] = useState<number | null>(initialUpperCursor);
  const [hasUpper, setHasUpper] = useState(initialHasUpper);
  const [lowerList, setLowerList] = useState<RankingEntry[]>([]);
  const [lowerCursor, setLowerCursor] = useState<number | null>(initialLowerCursor);
  const [hasLower, setHasLower] = useState(initialHasLower);
  const upperCursorRef = useRef(upperCursor);
  const hasUpperRef = useRef(hasUpper);
  const lowerCursorRef = useRef(lowerCursor);
  const hasLowerRef = useRef(hasLower);

  const resetWindowState = useCallback(() => {
    setActiveResetSignature(resetSignature);
    setUpperList([]);
    setUpperCursor(initialUpperCursor);
    setHasUpper(initialHasUpper);
    setLowerList([]);
    setLowerCursor(initialLowerCursor);
    setHasLower(initialHasLower);
    upperCursorRef.current = initialUpperCursor;
    hasUpperRef.current = initialHasUpper;
    lowerCursorRef.current = initialLowerCursor;
    hasLowerRef.current = initialHasLower;
    isFetchingUpperRef.current = false;
    isFetchingLowerRef.current = false;
    shouldAdjustUpperScrollRef.current = false;
    prevScrollHeightRef.current = 0;
  }, [initialHasLower, initialHasUpper, initialLowerCursor, initialUpperCursor, resetSignature]);

  const loadUpperRankings = useCallback(async () => {
    if (activeResetSignature !== resetSignature) {
      resetWindowState();
    }

    const scrollContainer = scrollContainerRef.current;
    const cursor = upperCursorRef.current;
    if (!scrollContainer || cursor === null || isFetchingUpperRef.current || !hasUpperRef.current)
      return;

    isFetchingUpperRef.current = true;
    prevScrollHeightRef.current = scrollContainer.scrollHeight;

    try {
      const response = await fetchRankingWindow(mode, cursor, 'upper', selectedWeek);
      shouldAdjustUpperScrollRef.current = true;
      upperCursorRef.current = response.nextCursor;
      hasUpperRef.current = response.hasNext;
      setUpperList((prevList) => mergeRankingEntries([...response.rankings, ...prevList]));
      setUpperCursor(response.nextCursor);
      setHasUpper(response.hasNext);
    } finally {
      isFetchingUpperRef.current = false;
    }
  }, [
    activeResetSignature,
    mode,
    resetSignature,
    resetWindowState,
    scrollContainerRef,
    selectedWeek,
  ]);

  const loadLowerRankings = useCallback(async () => {
    if (activeResetSignature !== resetSignature) {
      resetWindowState();
    }

    const cursor = lowerCursorRef.current;
    if (cursor === null || isFetchingLowerRef.current || !hasLowerRef.current) return;

    isFetchingLowerRef.current = true;

    try {
      const response = await fetchRankingWindow(mode, cursor, 'lower', selectedWeek);
      lowerCursorRef.current = response.nextCursor;
      hasLowerRef.current = response.hasNext;
      setLowerList((prevList) => mergeRankingEntries([...prevList, ...response.rankings]));
      setLowerCursor(response.nextCursor);
      setHasLower(response.hasNext);
    } finally {
      isFetchingLowerRef.current = false;
    }
  }, [activeResetSignature, mode, resetSignature, resetWindowState, selectedWeek]);

  const isCurrentWindow = activeResetSignature === resetSignature;

  return {
    upperList: isCurrentWindow ? upperList : [],
    lowerList: isCurrentWindow ? lowerList : [],
    hasUpper: isCurrentWindow ? hasUpper : initialHasUpper,
    hasLower: isCurrentWindow ? hasLower : initialHasLower,
    loadUpperRankings,
    loadLowerRankings,
    shouldAdjustUpperScrollRef,
    prevScrollHeightRef,
    resetWindowState,
  };
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
