// TODO: 공통 Provider 추가
import { createRootRoute, Outlet } from '@tanstack/react-router';

import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: RouteErrorFallback,
});
