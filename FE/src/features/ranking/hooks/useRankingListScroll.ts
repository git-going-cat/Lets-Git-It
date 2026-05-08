import { type RefObject, useEffect } from 'react';

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
  hasUserScrolled: boolean;
  visibleUpperListLength: number;
  shouldPreloadLowerRankings: boolean;
  setHasUserScrolled: (value: boolean) => void;
  loadUpperRankings: () => void;
  loadLowerRankings: () => void;
}

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
  hasUserScrolled,
  visibleUpperListLength,
  shouldPreloadLowerRankings,
  setHasUserScrolled,
  loadUpperRankings,
  loadLowerRankings,
}: UseRankingListScrollParams) {
  useEffect(() => {
    if (!shouldPreloadLowerRankings) return;

    loadLowerRankings();
  }, [loadLowerRankings, shouldPreloadLowerRankings]);

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
      if (!hasUserScrolled) {
        setHasUserScrolled(true);
      }

      if (
        direction === 'down' &&
        lowerObserverTarget.current &&
        isElementVisible(lowerObserverTarget.current, scrollContainer)
      ) {
        loadLowerRankings();
      }

      if (
        direction === 'up' &&
        upperObserverTarget.current &&
        isElementVisible(upperObserverTarget.current, scrollContainer)
      ) {
        loadUpperRankings();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    if (!hasUserScrolled) {
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    const upperObserver =
      upperObserverTarget.current && hasUpper
        ? new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting && scrollDirectionRef.current === 'up') {
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
              if (entries[0].isIntersecting && scrollDirectionRef.current === 'down') {
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
    hasUserScrolled,
    loadLowerRankings,
    loadUpperRankings,
    lowerObserverTarget,
    scrollContainerRef,
    scrollDirectionRef,
    setHasUserScrolled,
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
