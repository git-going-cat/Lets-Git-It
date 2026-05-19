/**
 * 기여도 뺏기 인게임 WebSocket 메시지 핸들러
 *
 * socketManager.subscribe 콜백에서 아래 라우터 함수를 호출하세요.
 *
 * ```ts
 * socketManager.subscribe(`/topic/room/${roomId}/contribution`, (msg) =>
 *   handleContributionGameTopicMessage(msg, ctx), GAME_KEY
 * );
 * socketManager.subscribe('/user/queue/private', (msg) =>
 *   handleContributionPrivateMessage(msg, privateCtx), PRIVATE_KEY
 * );
 * ```
 */

import { socketManager } from '@/core/socket/SocketManager';
import { baseMessageSchema } from '@/features/multi/schemas/room.schema';

const FORCE_DISCONNECT_CODES = new Set(['LOGGED_OUT', 'REPLACED_BY_NEW_LOGIN']);

import { contributionBus } from '../bridge/contributionBus';
import {
  CommandExpiredSchema,
  ContributionGameEndSchema,
  contributionGameTopicMessageSchema,
  ContributionInputFailedSchema,
  ContributionPlayerDisconnectedSchema,
  contributionPrivateMessageSchema,
  PositionUpdateSchema,
  ScoreUpdateSchema,
} from '../schemas/contribution.schema';
import { useContributionStore } from '../store/contributionStore';

import type {
  ContributionGameEndMessage,
  ContributionProgress,
  RankingEntry,
} from '../types/contribution.types';
import type { GameStatus } from '@/shared/types/game.types';
import type { MutableRefObject } from 'react';
import type { z } from 'zod';

type ContribStoreState = ReturnType<typeof useContributionStore.getState>;

type PositionUpdateMsg = z.infer<typeof PositionUpdateSchema>;
type ScoreUpdateMsg = z.infer<typeof ScoreUpdateSchema>;
type CommandExpiredMsg = z.infer<typeof CommandExpiredSchema>;
type ContributionPlayerDisconnectedMsg = z.infer<typeof ContributionPlayerDisconnectedSchema>;
type ContributionInputFailedMsg = z.infer<typeof ContributionInputFailedSchema>;

export interface ContributionGameCtx {
  myPlayerId: string | null;
  store: ContribStoreState;
  setScores: (scores: RankingEntry[]) => void;
  setProgress: (progress: ContributionProgress) => void;
  setCurrentSeq: (seq: number) => void;
  setGameResult: (result: ContributionGameEndMessage | null) => void;
  setGameStatus: (status: GameStatus) => void;
  currentSeqRef: MutableRefObject<number>;
}

export interface ContributionPrivateCtx {
  onForceDisconnect?: () => void;
  onKicked?: (roomId: number) => void;
  onPrivateError?: (code: string, message: string) => void;
}

// ──────────────────────────────────────────────────────────────────────────
// 개별 핸들러
// ──────────────────────────────────────────────────────────────────────────

export function handlePositionUpdate(msg: PositionUpdateMsg, ctx: ContributionGameCtx): void {
  ctx.store.updatePlayerBranch(msg.playerId, msg.branch);
  contributionBus.emit('position:update', { playerId: msg.playerId, branch: msg.branch });
  if (msg.playerId === ctx.myPlayerId) {
    contributionBus.emit('branch:switch', { branch: msg.branch, requestId: msg.requestId });
  }
}

export function handleScoreUpdate(msg: ScoreUpdateMsg, ctx: ContributionGameCtx): void {
  const nextSeq = msg.commandSequence + 1;
  const scores: RankingEntry[] = msg.scores.map((s) => ({
    ...s,
    isMe: s.playerId === ctx.myPlayerId,
  }));
  ctx.currentSeqRef.current = nextSeq;
  ctx.setScores(scores);
  ctx.setProgress(msg.progress);
  ctx.setCurrentSeq(nextSeq);
  contributionBus.emit('score:update', {
    scores,
    progress: msg.progress,
    commandSequence: msg.commandSequence,
    winnerId: msg.winnerId,
    requestId: msg.requestId,
  });
}

export function handleCommandExpired(msg: CommandExpiredMsg, ctx: ContributionGameCtx): void {
  const nextSeq = msg.commandSequence + 1;
  const scores: RankingEntry[] = msg.scores.map((s) => ({
    ...s,
    isMe: s.playerId === ctx.myPlayerId,
  }));
  ctx.currentSeqRef.current = nextSeq;
  ctx.setScores(scores);
  ctx.setProgress(msg.progress);
  ctx.setCurrentSeq(nextSeq);
  contributionBus.emit('command:expired', { commandSequence: msg.commandSequence, scores });
}

export function handleContributionGameEnd(
  msg: ContributionGameEndMessage,
  ctx: ContributionGameCtx
): void {
  ctx.setGameResult(msg);
  ctx.setGameStatus('ended');
  contributionBus.emit('game:end');
}

export function handleContributionPlayerDisconnected(
  msg: ContributionPlayerDisconnectedMsg,
  ctx: ContributionGameCtx
): void {
  const scores: RankingEntry[] = msg.scores.map((s) => ({
    ...s,
    isMe: s.playerId === ctx.myPlayerId,
  }));
  ctx.setScores(scores);
}

export function handleContributionInputFailed(msg: ContributionInputFailedMsg): void {
  contributionBus.emit('command:failed', {
    errorCode: msg.errorReason,
    requestId: msg.requestId,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 라우터
// ──────────────────────────────────────────────────────────────────────────

/**
 * /topic/room/{roomId}/contribution 수신 raw 메시지를 검증 후 적절한 핸들러로 위임한다.
 * CONTRIBUTION_GAME_END는 z.union 구조여서 discriminatedUnion 외부에서 별도 처리한다.
 */
export function handleContributionGameTopicMessage(raw: unknown, ctx: ContributionGameCtx): void {
  const base = baseMessageSchema.safeParse(raw);
  if (!base.success) {
    console.error('[WS] 기여도 게임 메시지 타입 추출 실패:', base.error);
    return;
  }

  if (base.data.type === 'CONTRIBUTION_GAME_END') {
    const r = ContributionGameEndSchema.safeParse(raw);
    if (!r.success) {
      console.error('[WS] CONTRIBUTION_GAME_END 파싱 실패:', r.error);
      return;
    }
    handleContributionGameEnd(r.data, ctx);
    return;
  }

  const result = contributionGameTopicMessageSchema.safeParse(raw);
  if (!result.success) {
    console.error('[WS] 기여도 게임 메시지 파싱 실패:', result.error);
    return;
  }

  switch (result.data.type) {
    case 'POSITION_UPDATE':
      handlePositionUpdate(result.data, ctx);
      break;
    case 'SCORE_UPDATE':
      handleScoreUpdate(result.data, ctx);
      break;
    case 'COMMAND_EXPIRED':
      handleCommandExpired(result.data, ctx);
      break;
    case 'CONTRIBUTION_PLAYER_DISCONNECTED':
      handleContributionPlayerDisconnected(result.data, ctx);
      break;
  }
}

/**
 * /user/queue/private 수신 raw 메시지를 검증 후 적절한 핸들러로 위임한다.
 * 알 수 없는 타입은 무시(기여도 게임 전용 큐가 아닌 메시지 혼입 방지).
 */
export function handleContributionPrivateMessage(raw: unknown, ctx: ContributionPrivateCtx): void {
  const result = contributionPrivateMessageSchema.safeParse(raw);
  if (!result.success) return;

  switch (result.data.type) {
    case 'CONTRIBUTION_INPUT_FAILED':
      handleContributionInputFailed(result.data);
      break;
    case 'FORCE_DISCONNECT':
      if (!FORCE_DISCONNECT_CODES.has(result.data.code)) break;
      socketManager.disconnect();
      ctx.onForceDisconnect?.();
      break;
    case 'KICKED':
      socketManager.disconnect();
      ctx.onKicked?.(result.data.roomId);
      break;
    case 'ERROR':
      console.error('[WS] 기여도 게임 에러:', result.data.code, result.data.message);
      ctx.onPrivateError?.(result.data.code, result.data.message);
      break;
  }
}
