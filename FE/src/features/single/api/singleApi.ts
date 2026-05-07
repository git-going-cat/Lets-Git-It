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
    const res = await http.post(`/api/v1/single/sessions/${sessionId}/result`, body);
    const parsed = apiResponseSchema(saveResultDataSchema).parse(res.data);
    return parsed.data;
  },
};
