import posthog from 'posthog-js';

import { env } from '@/config/env';

// 빈 키 환경에서 init이 가드되어 posthog가 uninitialized 상태로 남는다.
// 이 상태에서 capture/identify/reset 호출 시 콘솔 경고가 발생하므로 호출 자체를 no-op 처리.
const isEnabled = Boolean(env.POSTHOG_KEY);

const capture = (event: string, props?: Record<string, unknown>) => {
  if (!isEnabled) return;
  posthog.capture(event, props);
};

export const analytics = {
  identifyUser: (nickname: string) => {
    if (!isEnabled) return;
    posthog.identify(nickname, { nickname });
  },
  resetUser: () => {
    if (!isEnabled) return;
    posthog.reset();
  },

  gameModeSelected: (mode: 'single' | 'multi') => capture('game_mode_selected', { mode }),

  gameStarted: (mode: 'single' | 'tutorial', difficulty?: string) =>
    capture('game_started', { mode, difficulty }),

  gameCompleted: (difficulty: string, score: number, playTimeMs: number) =>
    capture('game_completed', { difficulty, score, play_time_ms: playTimeMs }),

  gameOver: (difficulty: string, playTimeMs: number) =>
    capture('game_over', { difficulty, play_time_ms: playTimeMs }),

  gameAbandoned: () => capture('game_abandoned'),

  tutorialStepCompleted: (step: number, total: number) =>
    capture('tutorial_step_completed', { step, total }),

  tutorialSkipped: (at_step: number) => capture('tutorial_skipped', { at_step }),
};
