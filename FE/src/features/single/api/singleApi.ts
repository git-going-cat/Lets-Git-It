import { http } from '@/core/http';
import { apiResponseSchema } from '@/features/auth/schemas/response.schema';

import { saveResultDataSchema, startSessionDataSchema } from '../schemas/single.schema';

import type { Difficulty, SaveResultRequest, StartSessionData } from '../types/single.types';

export const singleApi = {
  startSession: async (difficulty: Difficulty): Promise<StartSessionData> => {
    const res = await http.post('/api/v1/single/sessions', { difficulty });
    const parsed = apiResponseSchema(startSessionDataSchema).parse(res.data);
    return parsed.data;
  },

  saveResult: async (
    sessionId: string,
    body: SaveResultRequest
  ): Promise<{ isNewRecord: boolean }> => {
    try {
      const res = await http.post(`/api/v1/single/sessions/${sessionId}/result`, body);
      try {
        const parsed = apiResponseSchema(saveResultDataSchema).parse(res.data);
        return parsed.data;
      } catch {
        // BE 응답 구조가 스키마와 다를 경우 — 저장은 완료됐으므로 fallback 반환
        return { isNewRecord: false };
      }
    } catch (error) {
      const httpError = error as { response?: { status?: number } };
      if (httpError.response?.status === 409) {
        // 이미 저장된 세션 — 첫 저장만 인정하는 BE 정책, 정상 케이스로 처리
        return { isNewRecord: false };
      }
      throw error;
    }
  },
};
