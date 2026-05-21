import axios from 'axios';

import { env } from '@/config/env';

import { coachingResponseSchema } from '../schemas/coachingApi.schema';

import type { CoachingResponse } from '../schemas/coachingApi.schema';

const aiHttp = axios.create({
  baseURL: env.AI_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': env.AI_API_KEY,
  },
  timeout: 10000,
});

interface CoachingRequest {
  userInput: string;
  correctCommand: string;
  cardId: string;
  score: number;
  base: number;
  must: number;
  bonus: number;
  explanation?: string;
}

export async function fetchCoaching(req: CoachingRequest): Promise<CoachingResponse> {
  if (!env.AI_API_URL) throw new Error('AI_API_URL not configured');
  const { data } = await aiHttp.post<unknown>('/coaching', req);
  return coachingResponseSchema.parse(data);
}
