import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { incidentHintAtom } from '../store/incidentHintAtom';
import { incidentInputAtom } from '../store/incidentInputAtom';
import { incidentCardIndexAtom } from '../store/incidentNavAtom';
import { incidentPhaseAtom } from '../store/incidentPhaseAtom';
import {
  incidentBestScoreAtom,
  incidentHistoryAtom,
  incidentScoredAtom,
} from '../store/incidentScoreAtom';
import { incidentFlyingAtom, incidentVizAtom } from '../store/incidentVizAtom';

import { useIncidentInput } from './useIncidentInput';
import { useIncidentNavigation } from './useIncidentNavigation';
import { useIncidentPhase } from './useIncidentPhase';
import { useIncidentScore } from './useIncidentScore';
import { useIncidentVisualization } from './useIncidentVisualization';

import type { Card, IncidentStateRef } from '../types/incident.types';

/**
 * 사고처리반 게임 오케스트레이터.
 * 공유 stateRef를 생성하고 전문화 훅에 주입합니다.
 * 컴포넌트는 이 훅 하나만 호출하면 됩니다.
 */
export function useIncidentGame(cards: Card[], onComplete?: () => void) {
  const stateRef = useRef<IncidentStateRef>({
    cardIndex: 0,
    input: '',
    bestScore: 0,
    phase: 'idle',
  });

  // 초기화: 마운트 시 모든 원자를 cards[0] 기준으로 리셋
  const setViz = useSetAtom(incidentVizAtom);
  const setFlying = useSetAtom(incidentFlyingAtom);
  const setCardIndex = useSetAtom(incidentCardIndexAtom);
  const setInputAtom = useSetAtom(incidentInputAtom);
  const setPhaseAtom = useSetAtom(incidentPhaseAtom);
  const setScored = useSetAtom(incidentScoredAtom);
  const setBestScore = useSetAtom(incidentBestScoreAtom);
  const setHistory = useSetAtom(incidentHistoryAtom);
  const setShowHint = useSetAtom(incidentHintAtom);

  useEffect(() => {
    stateRef.current = { cardIndex: 0, input: '', bestScore: 0, phase: 'idle' };
    setCardIndex(0);
    setInputAtom('');
    setPhaseAtom('idle');
    setScored(null);
    setBestScore(0);
    setHistory([]);
    setShowHint(false);
    setFlying(null);
    setViz(cards[0].initialViz);
  }, [
    cards,
    setCardIndex,
    setInputAtom,
    setPhaseAtom,
    setScored,
    setBestScore,
    setHistory,
    setShowHint,
    setFlying,
    setViz,
  ]);

  // phase 원자 변경 시 stateRef 동기화
  const phase = useAtomValue(incidentPhaseAtom);
  useEffect(() => {
    stateRef.current.phase = phase;
  }, [phase]);

  // 전문화 훅
  const { setInput } = useIncidentInput(stateRef);
  const { refine } = useIncidentPhase(stateRef);
  const { finalize } = useIncidentScore(stateRef, cards);
  useIncidentVisualization(stateRef, cards);
  const { next } = useIncidentNavigation(stateRef, cards, onComplete);

  const [showHint, setShowHintAtom] = useAtom(incidentHintAtom);
  const toggleHint = useCallback(() => setShowHintAtom((s) => !s), [setShowHintAtom]);

  // 컴포넌트용 파생값
  const cardIndex = useAtomValue(incidentCardIndexAtom);
  const input = useAtomValue(incidentInputAtom);
  const scored = useAtomValue(incidentScoredAtom);
  const history = useAtomValue(incidentHistoryAtom);
  const viz = useAtomValue(incidentVizAtom);
  const flying = useAtomValue(incidentFlyingAtom);
  const card = cards[cardIndex];

  return {
    card,
    cardIndex,
    totalCards: cards.length,
    input,
    phase,
    scored,
    history,
    viz,
    flying,
    showHint,
    setInput,
    toggleHint,
    refine,
    finalize,
    next,
  };
}
