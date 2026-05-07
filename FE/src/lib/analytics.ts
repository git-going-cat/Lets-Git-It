import posthog from 'posthog-js';

export const analytics = {
  identifyUser: (nickname: string) => posthog.identify(nickname, { nickname }),
  resetUser: () => posthog.reset(),

  gameModeSelected: (mode: 'single' | 'multi') => posthog.capture('game_mode_selected', { mode }),

  gameStarted: (mode: 'single' | 'tutorial', difficulty?: string) =>
    posthog.capture('game_started', { mode, difficulty }),

  gameCompleted: (difficulty: string, score: number, playTimeMs: number) =>
    posthog.capture('game_completed', { difficulty, score, play_time_ms: playTimeMs }),

  gameOver: (difficulty: string, playTimeMs: number) =>
    posthog.capture('game_over', { difficulty, play_time_ms: playTimeMs }),

  gameAbandoned: () => posthog.capture('game_abandoned'),

  tutorialStepCompleted: (step: number, total: number) =>
    posthog.capture('tutorial_step_completed', { step, total }),

  tutorialSkipped: (at_step: number) => posthog.capture('tutorial_skipped', { at_step }),
};
