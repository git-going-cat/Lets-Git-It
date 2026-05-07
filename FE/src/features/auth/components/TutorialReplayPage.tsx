import { useNavigate } from '@tanstack/react-router';

import MatrixBackground from './onboarding/MatrixBackground';
import OnboardingModal from './onboarding/OnboardingModal';
import TutorialStep from './onboarding/TutorialStep';

export default function TutorialReplayPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    void navigate({ to: '/home' });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <MatrixBackground />
      <OnboardingModal title="튜토리얼 다시보기">
        <TutorialStep onComplete={handleComplete} />
      </OnboardingModal>
    </div>
  );
}
