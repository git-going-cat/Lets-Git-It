import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';

import { env } from '@/config/env';

// 빈 키 또는 dev 환경에서 init을 차단해 dev 이벤트가 prod 프로젝트로 유입되지 않도록 함
if (env.POSTHOG_KEY && env.MODE === 'production') {
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
    // 빈 키 또는 dev 환경에서는 init이 가드되어 posthogClient는 uninitialized 싱글톤.
    // capture 호출 시 콘솔 경고가 발생하므로 호출 자체를 가드.
    if (!env.POSTHOG_KEY || env.MODE !== 'production') return;
    if (posthogClient) {
      // OAuth callback의 code/state querystring을 strip해 PII 누출 방지
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      posthogClient.capture('$pageview', { $current_url: url.toString() });
    }
  }, [location.pathname, location.search, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
