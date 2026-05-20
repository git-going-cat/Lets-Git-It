import { type RefObject, useEffect, useRef } from 'react';

type RankingDirection = 'up' | 'down';

interface UseRankingListScrollParams {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  upperObserverTarget: RefObject<HTMLDivElement | null>;
  lowerObserverTarget: RefObject<HTMLDivElement | null>;
  lastScrollTopRef: RefObject<number>;
  previousScrollHeightRef: RefObject<number | null>;
  scrollDirectionRef: RefObject<RankingDirection | null>;
  suppressScrollRef: RefObject<boolean>;
  hasUpper: boolean;
  hasLower: boolean;
  visibleUpperListLength: number;
  visibleListLength: number;
  shouldPreloadLowerRankings: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  loadUpperRankings: () => void;
  loadLowerRankings: () => void;
}

/**
 * 랭킹 목록의 위/아래 양방향 무한 스크롤을 제어합니다.
 *
 * @description IntersectionObserver와 scroll fallback을 함께 사용해 sentinel이 이미 보이는
 * 상태에서도 이전/다음 랭킹 페이지를 가져오고, 위쪽 페이지가 추가될 때 현재 시야 위치를 유지합니다.
 */
export function useRankingListScroll({
  scrollContainerRef,
  upperObserverTarget,
  lowerObserverTarget,
  lastScrollTopRef,
  previousScrollHeightRef,
  scrollDirectionRef,
  suppressScrollRef,
  hasUpper,
  hasLower,
  visibleUpperListLength,
  visibleListLength,
  shouldPreloadLowerRankings,
  isFetchingNextPage,
  isFetchingPreviousPage,
  loadUpperRankings,
  loadLowerRankings,
}: UseRankingListScrollParams) {
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  const isFetchingPreviousPageRef = useRef(isFetchingPreviousPage);

  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  useEffect(() => {
    isFetchingPreviousPageRef.current = isFetchingPreviousPage;
  }, [isFetchingPreviousPage]);

  useEffect(() => {
    if (!shouldPreloadLowerRankings || isFetchingNextPage) return;
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    if (scrollContainer.scrollHeight > scrollContainer.clientHeight) return;

    loadLowerRankings();
  }, [
    isFetchingNextPage,
    loadLowerRankings,
    scrollContainerRef,
    shouldPreloadLowerRankings,
    visibleListLength,
  ]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return undefined;

    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      if (nextScrollTop === lastScrollTopRef.current) return;

      const direction: RankingDirection = nextScrollTop > lastScrollTopRef.current ? 'down' : 'up';
      scrollDirectionRef.current = direction;
      lastScrollTopRef.current = nextScrollTop;

      if (suppressScrollRef.current) return;

      if (
        direction === 'down' &&
        !isFetchingNextPageRef.current &&
        lowerObserverTarget.current &&
        isElementVisible(lowerObserverTarget.current, scrollContainer)
      ) {
        scrollDirectionRef.current = null;
        loadLowerRankings();
      }

      if (
        direction === 'up' &&
        !isFetchingPreviousPageRef.current &&
        upperObserverTarget.current &&
        isElementVisible(upperObserverTarget.current, scrollContainer)
      ) {
        scrollDirectionRef.current = null;
        loadUpperRankings();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    const upperObserver =
      upperObserverTarget.current && hasUpper
        ? new IntersectionObserver(
            (entries) => {
              if (
                entries[0].isIntersecting &&
                scrollDirectionRef.current === 'up' &&
                !isFetchingPreviousPageRef.current
              ) {
                scrollDirectionRef.current = null;
                loadUpperRankings();
              }
            },
            { root: scrollContainer, threshold: 1.0 }
          )
        : null;

    const lowerObserver =
      lowerObserverTarget.current && hasLower
        ? new IntersectionObserver(
            (entries) => {
              if (
                entries[0].isIntersecting &&
                scrollDirectionRef.current === 'down' &&
                !isFetchingNextPageRef.current
              ) {
                scrollDirectionRef.current = null;
                loadLowerRankings();
              }
            },
            { root: scrollContainer, threshold: 1.0 }
          )
        : null;

    if (upperObserverTarget.current) {
      upperObserver?.observe(upperObserverTarget.current);
    }

    if (lowerObserverTarget.current) {
      lowerObserver?.observe(lowerObserverTarget.current);
    }

    return () => {
      upperObserver?.disconnect();
      lowerObserver?.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [
    hasLower,
    hasUpper,
    loadLowerRankings,
    loadUpperRankings,
    lowerObserverTarget,
    scrollContainerRef,
    scrollDirectionRef,
    suppressScrollRef,
    upperObserverTarget,
    lastScrollTopRef,
  ]);

  useEffect(() => {
    const previousScrollHeight = previousScrollHeightRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (previousScrollHeight === null || !scrollContainer) return;

    const heightDelta = scrollContainer.scrollHeight - previousScrollHeight;
    if (heightDelta > 0) {
      scrollContainer.scrollTop += heightDelta;
      lastScrollTopRef.current = scrollContainer.scrollTop;
    }
    previousScrollHeightRef.current = null;
  }, [lastScrollTopRef, previousScrollHeightRef, scrollContainerRef, visibleUpperListLength]);
}

function isElementVisible(target: HTMLElement, scrollContainer: HTMLElement): boolean {
  const targetRect = target.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();

  return targetRect.bottom >= containerRect.top && targetRect.top <= containerRect.bottom;
}
