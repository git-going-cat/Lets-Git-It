import { createFileRoute, Navigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <div className="p-8 text-white">홈 화면으로 이동 중...</div>;
}

export const Route = createFileRoute('/')({
  component: HomeRedirect,
});
