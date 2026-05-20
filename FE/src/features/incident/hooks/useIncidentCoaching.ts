import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { fetchCoaching } from '../api/coachingApi';
import { incidentAiCoachingAtom } from '../store/incidentAiCoachingAtom';
import { incidentScoredAtom } from '../store/incidentScoreAtom';

import type { Card, IncidentStateRef } from '../types/incident.types';
import type { RefObject } from 'react';

/**
 * AI 코칭 API 호출을 담당합니다.
 * incidentAiCoachingAtom.status가 'loading'이 되면 fetchCoaching을 실행하고,
 * 응답 도착 시 'done'으로 전환합니다. 오류 시 message=null로 fallback.
 */
export function useIncidentCoaching(stateRef: RefObject<IncidentStateRef>, cards: Card[]) {
  const aiCoachingStatus = useAtomValue(incidentAiCoachingAtom).status;
  const scored = useAtomValue(incidentScoredAtom);
  const setAiCoaching = useSetAtom(incidentAiCoachingAtom);

  useEffect(() => {
    if (aiCoachingStatus !== 'loading' || !scored) return;

    const card = cards[stateRef.current.cardIndex];
    const { input } = stateRef.current;

    let cancelled = false;

    fetchCoaching({
      userInput: input,
      correctCommand: card.canonical,
      cardId: card.id,
      score: scored.total,
      base: scored.base,
      must: scored.must,
      bonus: scored.bonus,
      explanation: card.explanation,
    })
      .then((res) => {
        if (!cancelled) {
          setAiCoaching({ status: 'done', message: res.coaching || null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAiCoaching({ status: 'done', message: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [aiCoachingStatus, scored, cards, stateRef, setAiCoaching]);
}
