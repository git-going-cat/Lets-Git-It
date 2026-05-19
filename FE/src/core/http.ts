import axios from 'axios';

import { env } from '@/config/env'; // 환경변수 추가
import { reissueResponseDataSchema } from '@/features/auth/schemas/response.schema';
import { useAuthStore } from '@/features/auth/store/authStore';
import { faro } from '@/lib/faro';
import { getRouter } from '@/routerRegistry';
import { apiResponseSchema } from '@/shared/schemas/response.schema';

import type { InternalAxiosRequestConfig } from 'axios';

export const http = axios.create({
  baseURL: env.API_BASE_URL, // 환경변수 개발주소 연결
  withCredentials: true, // HttpOnly refreshToken 쿠키 자동 전송
  headers: { 'Content-Type': 'application/json' },
});

/**
 * 페이지 이탈 중 전송해야 하는 best-effort 요청을 보냅니다.
 *
 * @description axios가 지원하지 않는 keepalive 전송만 fetch를 사용하고, 호출 위치는 core/http로 제한합니다.
 */
export async function sendKeepAliveRequest(path: string, init?: RequestInit): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
    keepalive: true,
  });
}

// ── 요청 인터셉터: Bearer 토큰 주입 + X-Request-Id 부착 ──────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // BE MDC 로그와 연결하기 위한 요청 추적 ID — BE 팀과 헤더명 'X-Request-Id' 합의 필요
  // crypto.randomUUID()는 secure context(HTTPS) 필수 → dev HTTP 환경을 위한 fallback 포함
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  config.headers['X-Request-Id'] = requestId;
  return config;
});

// ── reissue 뮤텍스 ────────────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const resolvePendingQueue = (token: string) => {
  pendingQueue.forEach(({ resolve }) => resolve(token));
  pendingQueue = [];
};

const rejectPendingQueue = (error: unknown) => {
  pendingQueue.forEach(({ reject }) => reject(error));
  pendingQueue = [];
};

/**
 * 토큰 재발급 함수 — core/http.ts의 단일 reissue 경로.
 *
 * - isRefreshing 뮤텍스로 동시 호출 직렬화
 * - Zod로 응답 스키마 검증 → 스키마 불일치 시 즉시 throw (undefined 토큰 저장 방지)
 * - __root.tsx beforeLoad에서도 이 함수를 호출해 단일 경로 보장
 */
export async function reissueToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const res = await axios.post(
      `${env.API_BASE_URL}/api/v1/auth/reissue`,
      {},
      { withCredentials: true }
    );
    // Zod 검증: 스키마 불일치 시 throw → 무한 401 루프 방지
    const parsed = apiResponseSchema(reissueResponseDataSchema).parse(res.data);
    const newToken = parsed.data.accessToken;
    useAuthStore.getState().setAccessToken(newToken);
    resolvePendingQueue(newToken);
    return newToken;
  } catch (refreshError) {
    rejectPendingQueue(refreshError);
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

// ── 응답 인터셉터: 401 → reissue → 재시도 ────────────────────────────
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

      try {
        const newToken = await reissueToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      } catch (refreshError) {
        // 재발급 실패 → 인증 초기화 후 라우터로 로그인 페이지 이동 (SPA 상태 보존)
        // getRouter()는 routerRegistry 경유로 순환 의존성을 방지 (런타임에는 항상 존재)
        useAuthStore.getState().clearAuth();
        void getRouter()?.navigate({ to: '/login' });
        return Promise.reject(refreshError);
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
