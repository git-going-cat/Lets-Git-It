import axios from 'axios';

import { useAuthStore } from '@/features/auth/store/authStore';
import { faro } from '@/lib/faro';

import type { InternalAxiosRequestConfig } from 'axios';

export const http = axios.create({
  baseURL: '',
  withCredentials: true, // HttpOnly refreshToken 쿠키 자동 전송
  headers: { 'Content-Type': 'application/json' },
});

// ── 요청 인터셉터: Bearer 토큰 주입 + X-Request-Id 부착 ──────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // BE MDC 로그와 연결하기 위한 요청 추적 ID — BE 팀과 헤더명 'X-Request-Id' 합의 필요
  config.headers['X-Request-Id'] = crypto.randomUUID();
  return config;
});

// ── 응답 인터셉터: 401 → reissue → 재시도 ────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

http.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const axiosError = error as {
      config?: InternalAxiosRequestConfig & { _retry?: boolean };
      response?: { status?: number };
    };
    const original = axiosError.config;

    // 로그인·토큰 교환 요청은 리이슈 로직 제외 — 401이 "인증 실패"를 의미하므로 그대로 throw
    const AUTH_ENDPOINTS = ['/api/v1/auth/login', '/api/v1/auth/token'];
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => original?.url?.includes(ep));

    if (axiosError.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        // 재발급 중이면 대기 큐에 추가
        return new Promise<string>((resolve) => {
          pendingQueue.push(resolve);
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return http(original);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          '/api/v1/auth/reissue',
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        pendingQueue.forEach((cb) => cb(newToken));
        pendingQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 401 외 API 에러를 Faro에 기록 — requestId로 BE 로그와 연결
    const status = axiosError.response?.status;
    if (status && status !== 401) {
      faro?.api.pushError(new Error(`API ${status}: ${original?.url ?? ''}`), {
        context: {
          request_id: String(original?.headers?.['X-Request-Id'] ?? ''),
          url: original?.url ?? '',
          status: String(status),
        },
      });
    }

    return Promise.reject(error);
  }
);
