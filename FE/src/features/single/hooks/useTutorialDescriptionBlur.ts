import { useEffect, useState } from 'react';

import { TUTORIAL_BLUR_DURATION_MS } from '../constants/tutorialData';

import type { TutorialOverlayState } from './useTutorialMode';

/**
 * description phase 진입 시 화면 블러를 자동으로 띄우고, TUTORIAL_BLUR_DURATION_MS 후 자연 종료합니다.
 *
 * 반환되는 `blurActive`는 stepIndex 기반 derived 값이라 새 description 진입 시 첫 프레임부터 true가 보장됩니다.
 * (이전 step에서 spotlight 딤이 사라지는 순간 description 딤이 같은 색으로 즉시 채워져 시각적 끊김 방지).
 *
 * `markBlurDone`은 Enter 스킵 등 외부에서 즉시 블러를 종료할 때 호출합니다.
 */
export function useTutorialDescriptionBlur(state: TutorialOverlayState) {
  const [blurDoneStepIndex, setBlurDoneStepIndex] = useState<number | null>(null);
  const blurActive = state.phase === 'description' && blurDoneStepIndex !== state.stepIndex;

  useEffect(() => {
    if (state.phase !== 'description') return;
    const tOff = setTimeout(() => setBlurDoneStepIndex(state.stepIndex), TUTORIAL_BLUR_DURATION_MS);
    return () => clearTimeout(tOff);
  }, [state.phase, state.stepIndex]);

  const markBlurDone = () => setBlurDoneStepIndex(state.stepIndex);

  return { blurActive, markBlurDone };
}
