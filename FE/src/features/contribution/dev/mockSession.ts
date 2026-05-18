/**
 * 기여도 뺏기 개발용 mock 데이터 + WS 페이로드 생성기.
 * 모든 페이로드는 실제 서버 CONTRIBUTION_* 메시지 형태를 그대로 따른다.
 *
 * WS 연동 완료 시 제거 절차:
 * 1. 이 파일 삭제
 * 2. ContributionPage.tsx의 import + useLayoutEffect 블록 삭제, sessionId 가드 복원
 * 3. ContributionGameContent.tsx의 useMockContributionWs import + 호출 라인 삭제
 * 4. dev/useMockContributionWs.ts 삭제
 * 5. SocketManager.simulateIncoming 메서드 제거 (선택)
 */

import { MISS_SENTINEL_ID, MISS_SENTINEL_NICKNAME } from '../constants/score';

import type { ContributionStartedSchema } from '../schemas/contribution.schema';
import type { z } from 'zod';

type ContributionStarted = z.infer<typeof ContributionStartedSchema>;

/**
 * Mock에서 "나"의 playerId. 실제 흐름에서는 authStore에서 가져온다.
 * Zod v4의 z.string().uuid()는 RFC 4122 버전(3번째 그룹 첫 글자 `1-8`) +
 * variant(4번째 그룹 첫 글자 `8-b`) 비트를 강제하므로 v4 형식으로 지정.
 */
export const MOCK_MY_PLAYER_ID = '00000000-0000-4000-8000-000000000001';

export const MOCK_CONTRIBUTION_STARTED: ContributionStarted = {
  type: 'CONTRIBUTION_STARTED',
  serverTime: Date.now(),
  startAt: Date.now() + 1000,
  gameSessionId: '00000000-0000-4000-8000-000000000099',
  commandSetId: 1,
  initialBranch: 'main',
  commandSet: [
    { commandSequence: 0, text: 'git add .', branchName: 'main' },
    { commandSequence: 1, text: "git commit -m 'feat: 로그인'", branchName: 'feat/login' },
    { commandSequence: 2, text: 'git push origin feat/login', branchName: 'feat/login' },
    { commandSequence: 3, text: 'git merge feat/login', branchName: 'main' },
    { commandSequence: 4, text: "git commit -m 'fix: 버그 수정'", branchName: 'feat/signup' },
    { commandSequence: 5, text: 'git add .', branchName: 'feat/hotfix' },
    { commandSequence: 6, text: 'git push origin feat/hotfix', branchName: 'feat/hotfix' },
  ],
  players: [
    { playerId: MOCK_MY_PLAYER_ID, nickname: '나', bestContribution: 85 },
    { playerId: '00000000-0000-4000-8000-000000000002', nickname: '상대방A', bestContribution: 72 },
    { playerId: '00000000-0000-4000-8000-000000000003', nickname: '상대방B', bestContribution: 60 },
  ],
};

interface PlayerStats {
  playerId: string;
  nickname: string;
  wins: number;
}

interface ScoreEntryPayload {
  playerId: string;
  nickname: string;
  contribution: number;
  rank: number;
  isMe?: boolean;
}

/** 누적 wins + missCount → 정렬된 scores 배열 (miss sentinel 포함). */
export function buildScoresArray(
  stats: PlayerStats[],
  missCount: number,
  totalProcessed: number,
  myPlayerId: string
): ScoreEntryPayload[] {
  if (totalProcessed === 0) {
    return stats.map((s, i) => ({
      playerId: s.playerId,
      nickname: s.nickname,
      contribution: 0,
      rank: i + 1,
      isMe: s.playerId === myPlayerId,
    }));
  }

  const entries: ScoreEntryPayload[] = stats.map((s) => ({
    playerId: s.playerId,
    nickname: s.nickname,
    contribution: Math.round((s.wins / totalProcessed) * 100),
    rank: 0,
    isMe: s.playerId === myPlayerId,
  }));

  entries.push({
    playerId: MISS_SENTINEL_ID,
    nickname: MISS_SENTINEL_NICKNAME,
    contribution: Math.round((missCount / totalProcessed) * 100),
    rank: 0,
  });

  entries.sort((a, b) => b.contribution - a.contribution);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}

export function createScoreUpdatePayload(args: {
  gameSessionId: string;
  commandSequence: number;
  winnerId: string;
  scores: ScoreEntryPayload[];
  total: number;
  requestId?: string;
}) {
  const { gameSessionId, commandSequence, winnerId, scores, total, requestId } = args;
  const current = commandSequence + 1;
  return {
    type: 'SCORE_UPDATE' as const,
    gameSessionId,
    requestId: requestId ?? cryptoUuid(),
    serverTime: Date.now(),
    commandSequence,
    winnerId,
    scores,
    progress: { current, total, percent: Math.round((current / total) * 100) },
  };
}

export function createCommandExpiredPayload(args: {
  gameSessionId: string;
  commandSequence: number;
  scores: ScoreEntryPayload[];
  total: number;
}) {
  const { gameSessionId, commandSequence, scores, total } = args;
  const current = commandSequence + 1;
  // CommandExpiredSchema는 isMe optional 아님 → drop
  const strippedScores = scores.map((s) => ({
    playerId: s.playerId,
    nickname: s.nickname,
    contribution: s.contribution,
    rank: s.rank,
  }));
  return {
    type: 'COMMAND_EXPIRED' as const,
    gameSessionId,
    serverTime: Date.now(),
    commandSequence,
    scores: strippedScores,
    progress: { current, total, percent: Math.round((current / total) * 100) },
  };
}

export function createPositionUpdatePayload(args: {
  gameSessionId: string;
  playerId: string;
  branch: string;
  requestId?: string;
}) {
  return {
    type: 'POSITION_UPDATE' as const,
    gameSessionId: args.gameSessionId,
    serverTime: Date.now(),
    requestId: args.requestId ?? cryptoUuid(),
    playerId: args.playerId,
    branch: args.branch,
  };
}

export function createInputFailedPayload(args: {
  gameSessionId: string;
  playerId: string;
  errorReason: string;
  requestId?: string;
}) {
  return {
    type: 'CONTRIBUTION_INPUT_FAILED' as const,
    gameSessionId: args.gameSessionId,
    requestId: args.requestId ?? cryptoUuid(),
    serverTime: Date.now(),
    playerId: args.playerId,
    errorReason: args.errorReason,
  };
}

export function createGameEndPayload(args: {
  gameSessionId: string;
  rankings: ScoreEntryPayload[];
  winnerVideoTarget: string;
}) {
  return {
    type: 'CONTRIBUTION_GAME_END' as const,
    gameSessionId: args.gameSessionId,
    serverTime: Date.now(),
    isSuccess: true as const,
    reason: 'all_commands_completed',
    rankings: args.rankings,
    winnerVideoTarget: args.winnerVideoTarget,
  };
}

function cryptoUuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
