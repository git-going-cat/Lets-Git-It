// TODO: 공통 Provider 추가
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import axios from 'axios';

import { env } from '@/config/env';
import {
  apiResponseSchema,
  reissueResponseDataSchema,
} from '@/features/auth/schemas/response.schema';
import { useAuthStore, waitForAuthStoreHydration } from '@/features/auth/store/authStore';
import { fetchMyAuthUser } from '@/features/mypage/api/mypageApi';
import { PostHogPageView } from '@/providers/PostHogProvider';
import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';
import { useBgm } from '@/shared/hooks/useBgm';

/** 인증 없이 접근 가능한 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback/google'];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // 공개 경로는 인증 체크 없이 통과
    if (PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))) return;

    await waitForAuthStoreHydration();

    const { isAuthenticated, accessToken, clearAuth, setAccessToken, setAuth } =
      useAuthStore.getState();

    // 비인증 → 로그인 페이지로
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }

    // 새로고침으로 accessToken이 사라진 경우 → reissue로 복구
    // http 인터셉터를 우회해 raw axios를 쓰는 이유: 인터셉터가 또 reissue를 시도하는 중복 방지
    if (!accessToken) {
      let newAccessToken: string;

      try {
        const res = await axios.post(
          '/api/v1/auth/reissue',
          {},
          {
            baseURL: env.API_BASE_URL,
            withCredentials: true,
          }
        );
        const parsed = apiResponseSchema(reissueResponseDataSchema).parse(res.data);
        newAccessToken = parsed.data.accessToken;
        setAccessToken(newAccessToken);
      } catch {
        clearAuth();
        throw redirect({ to: '/login' });
      }

      try {
        const user = await fetchMyAuthUser();
        setAuth(newAccessToken, user);
      } catch {
        // 프로필 동기화 실패만으로 인증 상태를 지우지 않는다.
        // 온보딩 중 부분 프로필 응답/스키마 변경 시에도 reissue로 복구한 세션은 유지한다.
      }
    }
  },
  component: RootComponent,
  errorComponent: RouteErrorFallback,
});

function RootComponent() {
  useBgm();
  return (
    <>
      <PostHogPageView />
      <Outlet />
    </>
  );
}
