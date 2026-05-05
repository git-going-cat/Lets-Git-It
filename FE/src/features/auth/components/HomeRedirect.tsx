import { Navigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

export default function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <Navigate to="/home" />;
}
