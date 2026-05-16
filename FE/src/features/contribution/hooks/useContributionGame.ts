import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';

import { socketManager } from '@/core/socket/SocketManager';
import { BaseMessageSchema } from '@/features/multi/schemas/room.schema';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { contributionBus } from '../bridge/contributionBus';
import { MISS_SENTINEL_ID, MISS_SENTINEL_NICKNAME } from '../constants/score';
import {
  CommandExpiredSchema,
  ContributionGameEndSchema,
  ContributionInputFailedSchema,
  PositionUpdateSchema,
  ScoreUpdateSchema,
} from '../schemas/contribution.schema';
import { useContributionStore } from '../store/contributionStore';
import { currentCommandSeqAtom } from '../store/currentCommandSeqAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { progressAtom } from '../store/progressAtom';
import { scoresAtom } from '../store/scoresAtom';

import type { RankingEntry } from '../types/contribution.types';

/**
 * 기여도 뺏기 인게임 WS 이벤트 처리 훅.
 *
 * - /topic/room/{roomId}/contribution 구독: POSITION_UPDATE, SCORE_UPDATE, COMMAND_EXPIRED, CONTRIBUTION_GAME_END
 * - /user/queue/private 구독(contribution 전용 키): CONTRIBUTION_INPUT_FAILED
 * - contributionBus 'command:submit' 수신 시 CONTRIBUTION_INPUT WS 발행
 */
export function useContributionGame() {
  const roomId = useContributionStore((s) => s.roomId);
  const sessionId = useContributionStore((s) => s.sessionId);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);
  const updatePlayerBranch = useContributionStore((s) => s.updatePlayerBranch);

  const setGameStatus = useSetAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const setScores = useSetAtom(scoresAtom);
  const setProgress = useSetAtom(progressAtom);
  const setCurrentSeq = useSetAtom(currentCommandSeqAtom);

  // stale closure 방지: command:submit 핸들러 안에서 최신 seq를 읽기 위한 ref
  const currentSeqRef = useRef(0);

  // 게임 시작 상태로 전환 + 진행도/랭킹 초기화
  useEffect(() => {
    if (sessionId == null) return;
    setGameStatus('playing');
    setGameResult(null);
    const { commandSet, players } = useContributionStore.getState();
    setProgress({ current: 0, total: commandSet.length, percent: 0 });

    // 초기 랭킹: 모든 플레이어 + miss sentinel 모두 0%
    const initialScores: RankingEntry[] = players.map((p, i) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      contribution: 0,
      rank: i + 1,
      isMe: p.playerId === myPlayerId,
    }));
    initialScores.push({
      playerId: MISS_SENTINEL_ID,
      nickname: MISS_SENTINEL_NICKNAME,
      contribution: 0,
      rank: initialScores.length + 1,
    });
    setScores(initialScores);

    return () => {
      setGameStatus('idle');
    };
  }, [sessionId, myPlayerId, setGameStatus, setGameResult, setProgress, setScores]);

  // 게임 채널 구독
  useEffect(() => {
    if (roomId == null || !sessionId) return;

    const GAME_KEY = `contribution:game:${roomId}`;
    const PRIVATE_KEY = 'contribution:private';

    socketManager.subscribe(
      `/topic/room/${roomId}/contribution`,
      (message) => {
        const base = BaseMessageSchema.safeParse(message);
        if (!base.success) return;

        switch (base.data.type) {
          case 'POSITION_UPDATE': {
            const r = PositionUpdateSchema.safeParse(message);
            if (!r.success) return;
            updatePlayerBranch(r.data.playerId, r.data.branch);
            contributionBus.emit('position:update', {
              playerId: r.data.playerId,
              branch: r.data.branch,
            });
            if (r.data.playerId === myPlayerId) {
              contributionBus.emit('branch:switch', {
                branch: r.data.branch,
                requestId: r.data.requestId,
              });
            }
            break;
          }

          case 'SCORE_UPDATE': {
            const r = ScoreUpdateSchema.safeParse(message);
            if (!r.success) return;
            const nextSeq = r.data.commandSequence + 1;
            const scores: RankingEntry[] = r.data.scores.map((s) => ({
              ...s,
              isMe: s.playerId === myPlayerId,
            }));
            currentSeqRef.current = nextSeq;
            setScores(scores);
            setProgress(r.data.progress);
            setCurrentSeq(nextSeq);
            contributionBus.emit('score:update', {
              scores,
              progress: r.data.progress,
              commandSequence: nextSeq,
              winnerId: r.data.winnerId,
              requestId: r.data.requestId,
            });
            break;
          }

          case 'COMMAND_EXPIRED': {
            const r = CommandExpiredSchema.safeParse(message);
            if (!r.success) return;
            const nextSeq = r.data.commandSequence + 1;
            const scores: RankingEntry[] = r.data.scores.map((s) => ({
              ...s,
              isMe: s.playerId === myPlayerId,
            }));
            currentSeqRef.current = nextSeq;
            setScores(scores);
            setProgress(r.data.progress);
            setCurrentSeq(nextSeq);
            contributionBus.emit('command:expired', { commandSequence: nextSeq, scores });
            break;
          }

          case 'CONTRIBUTION_GAME_END': {
            const r = ContributionGameEndSchema.safeParse(message);
            if (!r.success) return;
            setGameResult(r.data);
            setGameStatus('ended');
            contributionBus.emit('game:end');
            break;
          }
        }
      },
      GAME_KEY
    );

    // CONTRIBUTION_INPUT_FAILED는 개인 채널로 수신
    socketManager.subscribe(
      '/user/queue/private',
      (message) => {
        const base = BaseMessageSchema.safeParse(message);
        if (!base.success || base.data.type !== 'CONTRIBUTION_INPUT_FAILED') return;

        const r = ContributionInputFailedSchema.safeParse(message);
        if (!r.success) return;
        contributionBus.emit('command:failed', {
          errorCode: r.data.errorReason,
          requestId: r.data.requestId,
        });
      },
      PRIVATE_KEY
    );

    return () => {
      socketManager.unsubscribe(GAME_KEY);
      socketManager.unsubscribe(PRIVATE_KEY);
    };
  }, [
    roomId,
    sessionId,
    myPlayerId,
    updatePlayerBranch,
    setGameStatus,
    setGameResult,
    setScores,
    setProgress,
    setCurrentSeq,
  ]);

  // command:submit → WS 발행
  useEffect(() => {
    if (roomId == null || !sessionId) return;

    const unsub = contributionBus.subscribe('command:submit', ({ text, requestId }) => {
      socketManager.publish(`/app/room/${roomId}/contribution/commands`, {
        type: 'CONTRIBUTION_INPUT',
        requestId,
        gameSessionId: sessionId,
        commandSequence: currentSeqRef.current,
        inputText: text,
      });
    });

    return unsub;
  }, [roomId, sessionId]);
}
