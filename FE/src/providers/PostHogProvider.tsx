import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';

import { env } from '@/config/env';

// 빈 키로 init 호출 시 PostHog가 콘솔에 misconfiguration 경고 — 18장에 따라 가드
if (env.POSTHOG_KEY) {
  posthog.init(env.POSTHOG_KEY, {
    api_host: env.POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
  });
}

/** RouterProvider 안에서 렌더해야 함 — __root.tsx의 RootComponent에서 사용 */
export function PostHogPageView() {
  const location = useRouterState({ select: (s) => s.location });
  const posthogClient = usePostHog();

  useEffect(() => {
    // 빈 키 환경에서는 init이 가드되어 posthogClient는 uninitialized 싱글톤.
    // capture 호출 시 콘솔 경고가 발생하므로 호출 자체를 가드.
    if (!env.POSTHOG_KEY) return;
    if (posthogClient) {
      posthogClient.capture('$pageview', { $current_url: window.location.href });
    }
  }, [location.pathname, location.search, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
