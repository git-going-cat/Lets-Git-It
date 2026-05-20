import { useEffect } from 'react';

import type { TutorialOverlayState } from './useTutorialMode';

interface UseTutorialOverlayKeysOptions {
  state: TutorialOverlayState;
  /** description phase에서 Enter 입력 시 호출. 블러/낙하 즉시 종료 콜백. */
  onSkipFall: () => void;
  /** info/explanation phase에서 Enter 입력 시 호출. */
  onNext: (stepIndex: number) => void;
}

/**
 * 튜토리얼 오버레이의 Enter 키 처리:
 *
 * - description phase: Enter → onSkipFall (낙하/블러 즉시 종료)
 * - info / explanation phase: Enter → onNext (다음 step)
 *
 * 마운트 직후 50ms 동안 입력을 무시합니다.
 * StartModal Enter(keydown)이 React passive effect 타이밍에 따라 이 리스너에 전달될 수 있고,
 * explanation 단계도 명령어 입력 Enter의 keyup이 포커스된 버튼을 클릭할 수 있기 때문.
 */
export function useTutorialOverlayKeys({
  state,
  onSkipFall,
  onNext,
}: UseTutorialOverlayKeysOptions) {
  useEffect(() => {
    const isDescription = state.phase === 'description';
    const isNextable = state.phase === 'info' || state.phase === 'explanation';
    if (!isDescription && !isNextable) return;

    let ready = false;
    const guardTimer = setTimeout(() => {
      ready = true;
    }, 50);

    const handler = (e: KeyboardEvent) => {
      if (!ready || e.key !== 'Enter') return;
      e.preventDefault();
      if (isDescription) {
        onSkipFall();
      } else {
        onNext(state.stepIndex);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      clearTimeout(guardTimer);
      window.removeEventListener('keydown', handler);
    };
  }, [state.phase, state.stepIndex, onSkipFall, onNext]);
}
