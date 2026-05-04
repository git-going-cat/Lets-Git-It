import { createFileRoute, Navigate } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';

function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return <div className="p-8 text-white">홈 화면 준비 중... (로그인됨)</div>;
}

export const Route = createFileRoute('/')({
  component: HomeRedirect,
});
