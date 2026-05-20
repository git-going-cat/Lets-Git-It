import { useCallback } from 'react';
import { useSetAtom } from 'jotai';

import { incidentBus } from '../bridge/incidentBus';
import { incidentHintAtom } from '../store/incidentHintAtom';
import { incidentInputAtom } from '../store/incidentInputAtom';
import { incidentCardIndexAtom } from '../store/incidentNavAtom';
import { incidentPhaseAtom } from '../store/incidentPhaseAtom';
import { incidentBestScoreAtom, incidentScoredAtom } from '../store/incidentScoreAtom';

import type { Card, IncidentStateRef } from '../types/incident.types';
import type { RefObject } from 'react';

/**
 * 카드 인덱스 전진 및 시나리오 완료 처리.
 * next() 호출 시 모든 카드별 상태를 초기화하고 'card:next' 또는 'scenario:complete'를 emit합니다.
 * viz 초기화는 'card:next' 구독자(useIncidentVisualization)가 담당합니다.
 */
export function useIncidentNavigation(
  stateRef: RefObject<IncidentStateRef>,
  cards: Card[],
  onComplete?: () => void
) {
  const setCardIndex = useSetAtom(incidentCardIndexAtom);
  const setInput = useSetAtom(incidentInputAtom);
  const setPhase = useSetAtom(incidentPhaseAtom);
  const setScored = useSetAtom(incidentScoredAtom);
  const setBestScore = useSetAtom(incidentBestScoreAtom);
  const setShowHint = useSetAtom(incidentHintAtom);

  const next = useCallback(() => {
    const { cardIndex } = stateRef.current;

    if (cardIndex >= cards.length - 1) {
      onComplete?.();
      incidentBus.emit('scenario:complete');
      return;
    }

    const nextIdx = cardIndex + 1;

    stateRef.current.cardIndex = nextIdx;
    stateRef.current.input = '';
    stateRef.current.bestScore = 0;
    stateRef.current.phase = 'idle';

    setCardIndex(nextIdx);
    setInput('');
    setPhase('idle');
    setScored(null);
    setBestScore(0);
    setShowHint(false);

    incidentBus.emit('card:next', { cardIndex: nextIdx });
  }, [
    cards.length,
    onComplete,
    stateRef,
    setCardIndex,
    setInput,
    setPhase,
    setScored,
    setBestScore,
    setShowHint,
  ]);

  return { next };
}
