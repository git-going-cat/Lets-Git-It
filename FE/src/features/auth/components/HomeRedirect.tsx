import { Navigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

import ReactivationNotice from './ReactivationNotice';

export default function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingReactivationNotice = useAuthStore((s) => s.pendingReactivationNotice);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (pendingReactivationNotice) {
    return <ReactivationNotice />;
  }

  return <Navigate to="/home" />;
}
