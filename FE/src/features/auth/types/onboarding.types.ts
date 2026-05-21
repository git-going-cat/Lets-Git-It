export type { CharacterFormValues, NicknameFormValues } from '../schemas/onboarding.schema';
export type { TutorialCommand, TutorialStep } from '@/shared/types/tutorial.types';

// ── 온보딩 진행 단계 ──────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'intro'
  | 'nickname'
  | 'character'
  | 'tutorial-prompt'
  | 'tutorial'
  | 'completing';
