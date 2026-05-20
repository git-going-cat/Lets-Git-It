import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';

import { incidentBus } from '../bridge/incidentBus';
import { incidentFlyingAtom, incidentVizAtom } from '../store/incidentVizAtom';

import type { Card, IncidentStateRef } from '../types/incident.types';
import type { RefObject } from 'react';

/**
 * viz 상태와 flying 애니메이션을 관리합니다.
 * 'card:graded' 이벤트를 구독해 성공 시 fly 트랜지션을 실행하고,
 * 'phase:idle' 이벤트(재시도)를 구독해 pendingTimeout 취소 + initialViz 복원,
 * 'card:next' 이벤트를 구독해 다음 카드의 initialViz로 초기화합니다.
 */
export function useIncidentVisualization(stateRef: RefObject<IncidentStateRef>, cards: Card[]) {
  const setViz = useSetAtom(incidentVizAtom);
  const setFlying = useSetAtom(incidentFlyingAtom);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = incidentBus.subscribe('card:graded', ({ input }) => {
      const { cardIndex } = stateRef.current;
      const currentCard = cards[cardIndex];
      if (!currentCard.flyTransition) return;

      const tx = currentCard.flyTransition;
      setFlying({ from: tx.flyFrom, to: tx.flyTo, files: tx.flyingFiles });

      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        setFlying(null);
        setViz((prev) => tx.apply(prev, { input }));
      }, tx.delayMs);
    });
    return () => {
      unsubscribe();
      if (pendingRef.current !== null) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, [cards, stateRef, setViz, setFlying]);

  // 재시도: 진행 중인 애니메이션 취소 + viz를 카드 초기 상태로 복원
  useEffect(() => {
    return incidentBus.subscribe('phase:idle', () => {
      if (pendingRef.current !== null) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      setFlying(null);
      const { cardIndex } = stateRef.current;
      setViz(cards[cardIndex].initialViz);
    });
  }, [cards, stateRef, setViz, setFlying]);

  useEffect(() => {
    return incidentBus.subscribe('card:next', ({ cardIndex }) => {
      if (pendingRef.current !== null) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      setFlying(null);
      setViz(cards[cardIndex].initialViz);
    });
  }, [cards, setViz, setFlying]);
}
