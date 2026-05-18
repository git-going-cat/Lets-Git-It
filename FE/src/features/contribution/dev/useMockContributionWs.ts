/**
 * 개발용 mock WS 시뮬레이터.
 * roomId === 0(mock 세션)일 때만 활성화된다.
 * socketManager.simulateIncoming을 사용해서 실제 WS 경로와 동일한 데이터 흐름을 만든다.
 *
 * 시뮬레이션 항목:
 * - command:submit → 정답 검증 → SCORE_UPDATE 또는 CONTRIBUTION_INPUT_FAILED
 *   (git switch는 POSITION_UPDATE → branch:switch relay 경로로 처리)
 * - 명령어 타임아웃 → COMMAND_EXPIRED (miss 누적)
 * - 상대방 랜덤 가로채기 → SCORE_UPDATE (다른 플레이어 winnerId)
 * - 주기적 POSITION_UPDATE → 다른 플레이어 랜덤 브랜치 이동
 * - 마지막 명령어 후 → CONTRIBUTION_GAME_END
 *
 * WS 연동 완료 시 제거 절차:
 * 1. 이 파일 삭제
 * 2. ContributionGameContent.tsx에서 import + 호출 라인 삭제
 */

import { useEffect } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { parseSwitchTarget } from '@/shared/game/branchParser';

import { contributionBus } from '../bridge/contributionBus';
import { useContributionStore } from '../store/contributionStore';

import {
  buildScoresArray,
  createCommandExpiredPayload,
  createGameEndPayload,
  createInputFailedPayload,
  createPositionUpdatePayload,
  createScoreUpdatePayload,
  MOCK_MY_PLAYER_ID,
} from './mockSession';

const COMMAND_TIMEOUT_MS = 10_000;
const MISS_FORCED_TIMEOUT_MS = 2_500;
const STEAL_MIN_MS = 4_000;
const STEAL_MAX_MS = 9_000;
const POSITION_UPDATE_INTERVAL_MS = 6_000;
const GAME_END_DELAY_MS = 800;

/** 미스 처리 시연용: 이 sequence들은 사용자 입력을 거부하고 빠르게 타임아웃됨. */
const MISS_FORCED_SEQUENCES = new Set<number>([2, 5]);

interface PlayerStat {
  playerId: string;
  nickname: string;
  wins: number;
}

interface MockState {
  currentSeq: number;
  stats: PlayerStat[];
  missCount: number;
  isGameEnded: boolean;
}

export function useMockContributionWs() {
  const roomId = useContributionStore((s) => s.roomId);

  useEffect(() => {
    if (roomId !== 0) return;
    socketManager.enterMockMode();

    // useEffect 마운트 시점의 스냅샷 — 이후 변경은 핸들러에서 getState()로 직접 읽음.
    const store = useContributionStore.getState();
    const totalCommands = store.commandSet.length;
    const gameSessionId = store.sessionId ?? 'mock-session';
    const myPlayerId = store.myPlayerId ?? MOCK_MY_PLAYER_ID;
    const topic = `/topic/room/${roomId}/contribution`;
    const privateQueue = '/user/queue/private';

    const state: MockState = {
      currentSeq: 0,
      stats: store.players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        wins: 0,
      })),
      missCount: 0,
      isGameEnded: false,
    };

    let timeoutTimer: number | undefined;
    let stealTimer: number | undefined;
    let positionTimer: number | undefined;

    const totalProcessed = () => state.stats.reduce((acc, s) => acc + s.wins, 0) + state.missCount;

    const buildScores = () =>
      buildScoresArray(state.stats, state.missCount, totalProcessed(), myPlayerId);

    const getCurrentCmd = () => store.commandSet[state.currentSeq];

    const getOpponents = () => state.stats.filter((s) => s.playerId !== myPlayerId);

    const clearCommandTimers = () => {
      if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
      if (stealTimer !== undefined) window.clearTimeout(stealTimer);
      timeoutTimer = undefined;
      stealTimer = undefined;
    };

    const isSwitch = (text: string) => text.trim().startsWith('git switch');

    const emitScoreUpdate = (winnerId: string, requestId?: string) => {
      const scores = buildScores();
      socketManager.simulateIncoming(
        topic,
        createScoreUpdatePayload({
          gameSessionId,
          commandSequence: state.currentSeq,
          winnerId,
          scores,
          total: totalCommands,
          requestId,
        })
      );
    };

    const emitCommandExpired = () => {
      const scores = buildScores();
      socketManager.simulateIncoming(
        topic,
        createCommandExpiredPayload({
          gameSessionId,
          commandSequence: state.currentSeq,
          scores,
          total: totalCommands,
        })
      );
    };

    const emitInputFailed = (reason: string, requestId?: string) => {
      socketManager.simulateIncoming(
        privateQueue,
        createInputFailedPayload({
          gameSessionId,
          playerId: myPlayerId,
          errorReason: reason,
          requestId,
        })
      );
    };

    const endGame = () => {
      if (state.isGameEnded) return;
      state.isGameEnded = true;
      clearCommandTimers();
      if (positionTimer !== undefined) window.clearInterval(positionTimer);
      const rankings = buildScores();
      const realRanked = state.stats.slice().sort((a, b) => b.wins - a.wins);
      const winnerVideoTarget = realRanked[0]?.playerId ?? myPlayerId;
      window.setTimeout(() => {
        socketManager.simulateIncoming(
          topic,
          createGameEndPayload({ gameSessionId, rankings, winnerVideoTarget })
        );
      }, GAME_END_DELAY_MS);
    };

    const scheduleTimersForCurrent = () => {
      clearCommandTimers();
      if (state.isGameEnded) return;
      if (state.currentSeq >= totalCommands) {
        endGame();
        return;
      }
      const cmd = getCurrentCmd();
      if (!cmd) return;

      // 미스 강제 시연용 sequence는 짧은 타임아웃 + 가로채기 없음
      if (MISS_FORCED_SEQUENCES.has(state.currentSeq)) {
        timeoutTimer = window.setTimeout(handleTimeout, MISS_FORCED_TIMEOUT_MS);
        return;
      }

      timeoutTimer = window.setTimeout(handleTimeout, COMMAND_TIMEOUT_MS);
      const stealDelay = STEAL_MIN_MS + Math.random() * (STEAL_MAX_MS - STEAL_MIN_MS);
      stealTimer = window.setTimeout(handleSteal, stealDelay);
    };

    const advance = () => {
      state.currentSeq += 1;
      if (state.currentSeq >= totalCommands) {
        endGame();
        return;
      }
      scheduleTimersForCurrent();
    };

    const handleTimeout = () => {
      if (state.isGameEnded) return;
      state.missCount += 1;
      emitCommandExpired();
      advance();
    };

    const handleSteal = () => {
      if (state.isGameEnded) return;
      const opps = getOpponents();
      if (opps.length === 0) return;
      const winner = opps[Math.floor(Math.random() * opps.length)];
      if (!winner) return;
      winner.wins += 1;
      emitScoreUpdate(winner.playerId);
      advance();
    };

    const handleUserSubmit = (text: string, requestId: string) => {
      if (state.isGameEnded) return;
      const cmd = getCurrentCmd();
      if (!cmd) return;

      // switch는 현재 명령어와 독립된 단순 브랜치 이동 — 미스 강제 시퀀스에서도 항상 통과.
      // commandSet에 들어오지 않으므로 채점 대상 아님.
      if (isSwitch(text)) {
        const branches = useContributionStore.getState().branches;
        const target = parseSwitchTarget(text);
        if (!target || !branches.includes(target)) {
          emitInputFailed('INVALID_BRANCH', requestId);
          return;
        }
        // 유효 브랜치 → POSITION_UPDATE emit (useContributionGame이 branch:switch로 relay)
        socketManager.simulateIncoming(
          topic,
          createPositionUpdatePayload({
            gameSessionId,
            playerId: myPlayerId,
            branch: target,
            requestId,
          })
        );
        return;
      }

      // 미스 강제 sequence는 일반 명령 입력만 거부 (어차피 곧 타임아웃)
      if (MISS_FORCED_SEQUENCES.has(state.currentSeq)) {
        emitInputFailed('WRONG_COMMAND', requestId);
        return;
      }

      if (text.trim() === cmd.text.trim()) {
        clearCommandTimers();
        const me = state.stats.find((s) => s.playerId === myPlayerId);
        if (me) me.wins += 1;
        emitScoreUpdate(myPlayerId, requestId);
        advance();
      } else {
        emitInputFailed('WRONG_COMMAND', requestId);
      }
    };

    const schedulePositionUpdates = () => {
      positionTimer = window.setInterval(() => {
        if (state.isGameEnded) return;
        const opps = getOpponents();
        const branches = useContributionStore.getState().branches;
        if (opps.length === 0 || branches.length === 0) return;
        const opp = opps[Math.floor(Math.random() * opps.length)];
        const branch = branches[Math.floor(Math.random() * branches.length)];
        if (!opp || !branch) return;
        socketManager.simulateIncoming(
          topic,
          createPositionUpdatePayload({
            gameSessionId,
            playerId: opp.playerId,
            branch,
          })
        );
      }, POSITION_UPDATE_INTERVAL_MS);
    };

    const unsubSubmit = contributionBus.subscribe('command:submit', ({ text, requestId }) => {
      handleUserSubmit(text, requestId);
    });

    scheduleTimersForCurrent();
    schedulePositionUpdates();

    return () => {
      clearCommandTimers();
      if (positionTimer !== undefined) window.clearInterval(positionTimer);
      unsubSubmit();
      socketManager.leaveMockMode();
    };
  }, [roomId]);
}
