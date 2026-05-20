import { useCallback } from 'react';
import { useSetAtom } from 'jotai';

import { incidentBus } from '../bridge/incidentBus';
import { incidentPhaseAtom } from '../store/incidentPhaseAtom';

import type { IncidentStateRef } from '../types/incident.types';
import type { RefObject } from 'react';

/**
 * 페이즈 상태 머신: scored → idle 되돌리기(refine)를 담당합니다.
 * refine 시 'phase:idle'을 emit해 useIncidentVisualization의 viz 초기화를 트리거합니다.
 */
export function useIncidentPhase(stateRef: RefObject<IncidentStateRef>) {
  const setPhase = useSetAtom(incidentPhaseAtom);

  const refine = useCallback(() => {
    stateRef.current.phase = 'idle';
    setPhase('idle');
    incidentBus.emit('phase:idle');
  }, [stateRef, setPhase]);

  return { refine };
}
