import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useAuthStore } from '@/features/auth/store/authStore';

interface IncidentProgressState {
  progressByUser: Record<string, number[]>;
  recordClear: (memberId: string, scenarioId: number) => void;
  isCleared: (memberId: string, scenarioId: number) => boolean;
}

export const useIncidentProgressStore = create<IncidentProgressState>()(
  persist(
    (set, get) => ({
      progressByUser: {},
      recordClear: (memberId, id) =>
        set((s) => {
          const cur = s.progressByUser[memberId] ?? [];
          if (cur.includes(id)) return s;
          return { progressByUser: { ...s.progressByUser, [memberId]: [...cur, id] } };
        }),
      isCleared: (memberId, id) => (get().progressByUser[memberId] ?? []).includes(id),
    }),
    { name: 'incident-progress' }
  )
);

/** memberId('guest' for unauthenticated) 바인딩 헬퍼. 유저 전환 시에도 올바른 진행도를 읽는다. */
export function useIncidentProgress() {
  const memberId = useAuthStore((s) => s.user?.memberId ?? 'guest');
  const recordClearRaw = useIncidentProgressStore((s) => s.recordClear);
  const isClearedRaw = useIncidentProgressStore((s) => s.isCleared);
  const recordClear = useCallback(
    (id: number) => recordClearRaw(memberId, id),
    [recordClearRaw, memberId]
  );
  const isCleared = useCallback(
    (id: number) => isClearedRaw(memberId, id),
    [isClearedRaw, memberId]
  );
  return { recordClear, isCleared };
}
