// TODO: 공통 Provider 추가
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import axios from 'axios';

import {
  apiResponseSchema,
  reissueResponseDataSchema,
} from '@/features/auth/schemas/response.schema';
import { useAuthStore } from '@/features/auth/store/authStore';
import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';
import { useBgm } from '@/shared/hooks/useBgm';

/** 인증 없이 접근 가능한 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback/google'];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // 공개 경로는 인증 체크 없이 통과
    if (PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))) return;

    const { isAuthenticated, accessToken, clearAuth, setAccessToken } = useAuthStore.getState();

    // 비인증 → 로그인 페이지로
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }

    // 새로고침으로 accessToken이 사라진 경우 → reissue로 복구
    // http 인터셉터를 우회해 raw axios를 쓰는 이유: 인터셉터가 또 reissue를 시도하는 중복 방지
    if (!accessToken) {
      try {
        const res = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true });
        const parsed = apiResponseSchema(reissueResponseDataSchema).parse(res.data);
        setAccessToken(parsed.data.accessToken);
      } catch {
        clearAuth();
        throw redirect({ to: '/login' });
      }
    }
  },
  component: RootComponent,
  errorComponent: RouteErrorFallback,
});

function RootComponent() {
  useBgm();
  return <Outlet />;
}
