import axios from 'axios';

import { useAuthStore } from '@/features/auth/store/authStore';

import type { InternalAxiosRequestConfig } from 'axios';

export const http = axios.create({
  baseURL: '',
  withCredentials: true, // HttpOnly refreshToken 쿠키 자동 전송
  headers: { 'Content-Type': 'application/json' },
});

// ── 요청 인터셉터: Bearer 토큰 주입 ──────────────────────────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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

    if (axiosError.response?.status === 401 && original && !original._retry) {
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

    return Promise.reject(error);
  }
);
