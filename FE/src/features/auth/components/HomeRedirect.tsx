import { Navigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

import ReactivationNotice from './ReactivationNotice';

export default function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingReactivationNotice = useAuthStore((s) => s.pendingReactivationNotice);
  const onboardingStatus = useAuthStore((s) => s.user?.onboardingStatus);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // pendingReactivationNotice를 onboardingStatus보다 먼저 체크:
  // isReactivated=true이면서 온보딩 미완 상태일 때 ReactivationNotice가 표시되어야 함.
  if (pendingReactivationNotice) {
    return <ReactivationNotice />;
  }

  if (onboardingStatus !== 'TUTORIAL_DONE') {
    return <Navigate to="/onboarding" />;
  }

  return <Navigate to="/home" />;
}
