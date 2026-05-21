import { atom } from 'jotai';

interface AiCoachingState {
  status: 'idle' | 'loading' | 'done';
  message: string | null;
}

export const incidentAiCoachingAtom = atom<AiCoachingState>({ status: 'idle', message: null });
