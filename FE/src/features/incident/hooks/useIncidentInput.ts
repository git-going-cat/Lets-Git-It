import { useCallback } from 'react';
import { useSetAtom } from 'jotai';

import { incidentInputAtom } from '../store/incidentInputAtom';

import type { IncidentStateRef } from '../types/incident.types';
import type { MutableRefObject } from 'react';

/**
 * 사용자 입력 텍스트 관리.
 * stateRef를 동기적으로 업데이트해 finalize 등의 콜백에서 stale closure 없이 최신 값을 읽을 수 있도록 합니다.
 */
export function useIncidentInput(stateRef: MutableRefObject<IncidentStateRef>) {
  const setInputAtom = useSetAtom(incidentInputAtom);

  const setInput = useCallback(
    (value: string) => {
      stateRef.current.input = value;
      setInputAtom(value);
    },
    [stateRef, setInputAtom]
  );

  return { setInput };
}
