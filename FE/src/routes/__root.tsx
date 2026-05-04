// TODO: 공통 Provider, ErrorBoundary 추가
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
