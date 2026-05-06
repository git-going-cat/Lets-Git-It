export type {
  CharacterFormValues,
  NicknameFormValues,
  TutorialCommand,
  TutorialStep,
} from '../schemas/onboarding.schema';

// ── 온보딩 진행 단계 ──────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'intro'
  | 'nickname'
  | 'character'
  | 'tutorial-prompt'
  | 'tutorial'
  | 'completing';
