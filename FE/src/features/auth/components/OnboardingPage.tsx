import { useOnboarding } from '../hooks/useOnboarding';

import CharacterSetup from './CharacterSetup';
import NicknameSetup from './NicknameSetup';
import IntroStep from './onboarding/IntroStep';
import MatrixBackground from './onboarding/MatrixBackground';
import OnboardingModal from './onboarding/OnboardingModal';
import TutorialPromptStep from './onboarding/TutorialPromptStep';
import TutorialStep from './onboarding/TutorialStep';

import type { OnboardingStep } from '../types/onboarding.types';

const STEP_TITLE: Record<OnboardingStep, string> = {
  intro: '환영합니다',
  nickname: '닉네임 설정',
  character: '사용자 설정',
  'tutorial-prompt': '튜토리얼',
  tutorial: '튜토리얼 진행 중',
  completing: '완료 중...',
};

/**
 * 온보딩 전체 흐름을 담당하는 페이지 컴포넌트.
 *
 * MatrixBackground 위에 OnboardingModal을 겹쳐 표시하며,
 * useOnboarding 훅이 관리하는 step에 따라 단계 컴포넌트를 렌더링합니다.
 */
export default function OnboardingPage() {
  const { step, goToStep, finishOnboarding } = useOnboarding();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <MatrixBackground />

      <OnboardingModal title={STEP_TITLE[step]}>
        {step === 'intro' && <IntroStep onDone={() => goToStep('nickname')} />}

        {step === 'nickname' && <NicknameSetup onComplete={() => goToStep('character')} />}

        {step === 'character' && <CharacterSetup onComplete={() => goToStep('tutorial-prompt')} />}

        {step === 'tutorial-prompt' && (
          <TutorialPromptStep onYes={() => goToStep('tutorial')} onNo={finishOnboarding} />
        )}

        {step === 'tutorial' && <TutorialStep onComplete={finishOnboarding} />}

        {step === 'completing' && (
          <div className="flex items-center justify-center h-24">
            <p className="text-white text-sm animate-pulse">온보딩을 완료하는 중...</p>
          </div>
        )}
      </OnboardingModal>
    </div>
  );
}
