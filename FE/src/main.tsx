import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useIncidentProgressStore } from '@/features/incident/store/incidentProgressStore';

import App from './App.tsx';
import { env } from './config/env';

import './index.css';

import './lib/faro'; // Faro 조기 초기화 — 이후 모든 에러·로그에 컨텍스트 부착

// incident-progress legacy 키(구 포맷: {state:{clearedScenarios:[]}}) → 새 구조로 1회 흡수
// 새 스토어는 고정 키 'incident-progress'에 {state:{progressByUser:{memberId:[]}}} 형태로 저장
// setState 후 persist 구독자가 자동으로 새 형식을 같은 키에 덮어쓰므로 removeItem 불필요
const legacyRaw = localStorage.getItem('incident-progress');
if (legacyRaw) {
  try {
    const parsed = JSON.parse(legacyRaw) as { state?: { clearedScenarios?: number[] } };
    const cleared = parsed.state?.clearedScenarios;
    if (cleared?.length) {
      const memberId = useAuthStore.getState().user?.memberId ?? 'guest';
      useIncidentProgressStore.setState((prev) => ({
        progressByUser: {
          ...prev.progressByUser,
          [memberId]: cleared,
        },
      }));
    }
  } catch {
    // 파싱 실패 시 무시
  }
}

Sentry.init({
  dsn: env.SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  // Web Vitals(LCP·INP·CLS)는 browserTracingIntegration이 자동 수집
  tracesSampleRate: 1.0,
  environment: env.MODE,
  enabled: !!env.SENTRY_DSN,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="font-pixel flex min-h-screen items-center justify-center bg-[#1b1a4b]">
          <div className="nes-container is-dark with-title text-center">
            <p className="title">ERROR</p>
            <p className="text-white">예상치 못한 오류가 발생했습니다.</p>
            <p className="mt-2 text-gray-400">잠시 후 새로고침 해주세요.</p>
            <button
              type="button"
              className="nes-btn is-primary mt-4"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
