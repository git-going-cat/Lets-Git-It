import { beforeEach, describe, expect, it } from 'vitest';

import { useSingleStore } from './singleStore';

import type { Command } from '../types/single.types';

const mockCommandSet: Command[] = [
  {
    commandSequence: 0,
    text: "git commit -m 'init'",
    displayText: 'init',
    branchName: 'main',
    type: 'COMMON',
  },
];

const mockSession = {
  sessionId: 'session-abc-123',
  difficulty: 'NORMAL' as const,
  bestScore: 8000,
  commandSet: mockCommandSet,
  githubName: 'gitcat-dev',
};

beforeEach(() => {
  useSingleStore.getState().clearSession();
});

describe('useSingleStore', () => {
  describe('setSession', () => {
    it('세션 데이터를 저장하면 모든 필드가 정확히 반영된다', () => {
      useSingleStore.getState().setSession(mockSession);

      const { sessionId, difficulty, bestScore, commandSet } = useSingleStore.getState();

      expect(sessionId).toBe(mockSession.sessionId);
      expect(difficulty).toBe(mockSession.difficulty);
      expect(bestScore).toBe(mockSession.bestScore);
      expect(commandSet).toEqual(mockSession.commandSet);
    });

    it('bestScore 0인 세션을 저장하면 0으로 설정된다', () => {
      useSingleStore.getState().setSession({ ...mockSession, bestScore: 0 });

      expect(useSingleStore.getState().bestScore).toBe(0);
    });
  });

  describe('clearSession', () => {
    it('clearSession 호출 후 모든 필드가 초기값으로 복귀된다', () => {
      useSingleStore.getState().setSession(mockSession);
      useSingleStore.getState().clearSession();

      const { sessionId, difficulty, bestScore, commandSet } = useSingleStore.getState();

      expect(sessionId).toBeNull();
      expect(difficulty).toBeNull();
      expect(bestScore).toBe(0);
      expect(commandSet).toEqual([]);
    });

    it('세션 저장 없이 clearSession을 호출해도 에러가 발생하지 않는다', () => {
      expect(() => useSingleStore.getState().clearSession()).not.toThrow();
    });
  });
});
