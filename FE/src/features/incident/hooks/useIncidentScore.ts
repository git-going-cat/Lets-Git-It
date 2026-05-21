import { useCallback } from 'react';
import { useSetAtom } from 'jotai';

import { env } from '@/config/env';

import { incidentBus } from '../bridge/incidentBus';
import { incidentAiCoachingAtom } from '../store/incidentAiCoachingAtom';
import { incidentPhaseAtom } from '../store/incidentPhaseAtom';
import {
  incidentBestScoreAtom,
  incidentHistoryAtom,
  incidentScoredAtom,
} from '../store/incidentScoreAtom';

import type { Card, HistoryEntry, IncidentStateRef, ScoreResult } from '../types/incident.types';
import type { RefObject } from 'react';

/**
 * 카드 채점 로직.
 * idle → scored 페이즈 전환과 히스토리·bestScore 갱신을 담당합니다.
 * perfect/accepted 결과일 때만 incidentBus에 'card:graded'를 emit해 viz 트랜지션을 트리거합니다.
 */
const AI_COACHED_STATUSES = new Set(['wrong', 'partial', 'forbidden']);

export function useIncidentScore(stateRef: RefObject<IncidentStateRef>, cards: Card[]) {
  const setPhase = useSetAtom(incidentPhaseAtom);
  const setScored = useSetAtom(incidentScoredAtom);
  const setBestScore = useSetAtom(incidentBestScoreAtom);
  const setHistory = useSetAtom(incidentHistoryAtom);
  const setAiCoaching = useSetAtom(incidentAiCoachingAtom);

  const finalize = useCallback(() => {
    const { input, bestScore, cardIndex } = stateRef.current;
    const currentCard = cards[cardIndex];
    const result = currentCard.grade(input);
    if (!result) return;

    const isLowerThanBest = result.total < bestScore;
    const effective: ScoreResult = isLowerThanBest
      ? {
          ...result,
          status: 'lower-retry',
          coaching: '',
        }
      : result;

    const color =
      effective.status === 'perfect' || effective.status === 'accepted'
        ? '#92cc41'
        : effective.status === 'partial'
          ? '#f0c64a'
          : '#e76e55';

    const entry: HistoryEntry = {
      text: input.trim(),
      color,
      score: result.total,
      cardId: currentCard.id,
      mockOutput:
        effective.status === 'perfect' || effective.status === 'accepted'
          ? currentCard.mockOutput
          : undefined,
    };

    const newBest = isLowerThanBest ? bestScore : result.total;
    stateRef.current.bestScore = newBest;

    if (AI_COACHED_STATUSES.has(effective.status) && env.AI_API_URL) {
      setAiCoaching({ status: 'loading', message: null });
    }

    setScored(effective);
    setHistory((h) => [...h, entry]);
    setBestScore(newBest);
    stateRef.current.phase = 'scored';
    setPhase('scored');

    if (
      (effective.status === 'perfect' || effective.status === 'accepted') &&
      currentCard.flyTransition
    ) {
      incidentBus.emit('card:graded', { result: effective, input });
    }
  }, [cards, stateRef, setPhase, setScored, setHistory, setBestScore, setAiCoaching]);

  return { finalize };
}
