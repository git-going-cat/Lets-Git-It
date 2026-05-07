import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

import App from './App.tsx';

import './index.css';

import './lib/faro'; // Faro 조기 초기화 — 이후 모든 에러·로그에 컨텍스트 부착

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  // Web Vitals(LCP·INP·CLS)는 browserTracingIntegration이 자동 수집
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
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
