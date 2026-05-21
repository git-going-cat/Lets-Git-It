import { beforeEach, describe, expect, it } from 'vitest';

import { useSingleStore } from './singleStore';

describe('useSingleStore', () => {
  beforeEach(() => {
    useSingleStore.getState().clearSession();
  });

  it('초기 상태에서 세션 필드는 null, playLog는 빈 배열', () => {
    const state = useSingleStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.difficulty).toBeNull();
    expect(state.bestScore).toBe(0);
    expect(state.commandSet).toEqual([]);
    expect(state.playLog).toEqual([]);
  });

  describe('setSession', () => {
    it('API 응답 데이터를 스토어에 저장한다', () => {
      useSingleStore.getState().setSession({
        sessionId: 'abc-123',
        difficulty: 'NORMAL',
        bestScore: 200,
        commandSet: [],
      });
      const state = useSingleStore.getState();
      expect(state.sessionId).toBe('abc-123');
      expect(state.difficulty).toBe('NORMAL');
      expect(state.bestScore).toBe(200);
    });

    it('세션 교체 시 기존 playLog를 초기화한다', () => {
      useSingleStore.getState().appendLog({ seq: 0, event: 'typo' });
      useSingleStore.getState().setSession({
        sessionId: 'new-session',
        difficulty: 'EASY',
        bestScore: 0,
        commandSet: [],
      });
      expect(useSingleStore.getState().playLog).toEqual([]);
    });
  });

  describe('appendLog', () => {
    it('항목을 순서대로 누적한다', () => {
      useSingleStore.getState().appendLog({ seq: 0, event: 'complete' });
      useSingleStore.getState().appendLog({ seq: 1, event: 'miss' });
      useSingleStore.getState().appendLog({ seq: 2, event: 'typo' });
      expect(useSingleStore.getState().playLog).toEqual([
        { seq: 0, event: 'complete' },
        { seq: 1, event: 'miss' },
        { seq: 2, event: 'typo' },
      ]);
    });
  });

  describe('clearSession', () => {
    it('세션 데이터와 playLog를 초기 상태로 리셋한다', () => {
      useSingleStore.getState().setSession({
        sessionId: 'abc',
        difficulty: 'HARD',
        bestScore: 500,
        commandSet: [],
      });
      useSingleStore.getState().appendLog({ seq: 0, event: 'typo' });
      useSingleStore.getState().clearSession();
      const state = useSingleStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.difficulty).toBeNull();
      expect(state.playLog).toEqual([]);
    });
  });
});
