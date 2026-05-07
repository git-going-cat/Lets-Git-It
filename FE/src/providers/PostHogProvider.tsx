import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
});

/** RouterProvider 안에서 렌더해야 함 — __root.tsx의 RootComponent에서 사용 */
export function PostHogPageView() {
  const location = useRouterState({ select: (s) => s.location });
  const posthogClient = usePostHog();

  useEffect(() => {
    if (posthogClient) {
      posthogClient.capture('$pageview', { $current_url: window.location.href });
    }
  }, [location.pathname, location.search, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
