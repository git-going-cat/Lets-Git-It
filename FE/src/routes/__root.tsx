// TODO: 공통 Provider 추가
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';

import { reissueToken } from '@/core/http';
import { useAuthStore, waitForAuthStoreHydration } from '@/features/auth/store/authStore';
import { fetchMyAuthUser } from '@/features/mypage/api/mypageApi';
import { PostHogPageView } from '@/providers/PostHogProvider';
import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';
import { RouteNotFoundFallback } from '@/shared/components/RouteNotFoundFallback';

/** 인증 없이 접근 가능한 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback/google'];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // 공개 경로는 인증 체크 없이 통과
    if (PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))) return;

    await waitForAuthStoreHydration();

    const { isAuthenticated, accessToken, clearAuth, setAuth } = useAuthStore.getState();

    // 비인증 → 로그인 페이지로
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }

    // 새로고침으로 accessToken이 사라진 경우 → reissueToken()으로 복구
    // core/http.ts의 단일 reissue 경로를 사용해 인터셉터와의 race 방지
    if (!accessToken) {
      let newAccessToken: string;

      try {
        newAccessToken = await reissueToken();
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
  notFoundComponent: RouteNotFoundFallback,
});

function RootComponent() {
  return (
    <>
      <PostHogPageView />
      <Outlet />
    </>
  );
}
