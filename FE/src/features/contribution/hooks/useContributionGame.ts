import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import { analytics } from '@/lib/analytics';
import { isSwitchCommand } from '@/shared/game/branchParser';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { contributionBus } from '../bridge/contributionBus';
import {
  handleContributionGameTopicMessage,
  handleContributionPrivateMessage,
} from '../handlers/contributionSocketHandlers';
import { useContributionStore } from '../store/contributionStore';
import { currentCommandSeqAtom } from '../store/currentCommandSeqAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { progressAtom } from '../store/progressAtom';
import { scoresAtom } from '../store/scoresAtom';
import { buildInitialScores } from '../utils/initialScores';

interface UseContributionGameOptions {
  onForceDisconnect?: () => void;
  onKicked?: (roomId: number) => void;
  onPrivateError?: (code: string, message: string) => void;
}

/**
 * 기여도 뺏기 인게임 WS 이벤트 처리 훅.
 *
 * - /topic/room/{roomId}/contribution 구독: POSITION_UPDATE, SCORE_UPDATE, COMMAND_EXPIRED,
 *   CONTRIBUTION_GAME_END, CONTRIBUTION_PLAYER_DISCONNECTED
 * - /user/queue/private 구독(contribution 전용 키): CONTRIBUTION_INPUT_FAILED, FORCE_DISCONNECT,
 *   KICKED, ERROR
 * - contributionBus 'command:submit'/'command:expire' 수신 시 WS 발행
 */
export function useContributionGame({
  onForceDisconnect,
  onKicked,
  onPrivateError,
}: UseContributionGameOptions = {}) {
  const roomId = useContributionStore((s) => s.roomId);
  const sessionId = useContributionStore((s) => s.sessionId);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);
  const accessToken = useAuthStore((s) => s.accessToken);

  const setGameStatus = useSetAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const setScores = useSetAtom(scoresAtom);
  const setProgress = useSetAtom(progressAtom);
  const setCurrentSeq = useSetAtom(currentCommandSeqAtom);

  // stale closure 방지: command:submit 핸들러 안에서 최신 seq를 읽기 위한 ref
  const currentSeqRef = useRef(0);

  // 게임 시작 상태로 전환 + 진행도/랭킹 초기화
  // startAt까지 'idle'로 유지해 카운트다운 UI를 표시하고, startAt 도달 시 'playing'으로 전환한다.
  useEffect(() => {
    if (sessionId == null) return;
    setGameResult(null);
    currentSeqRef.current = 1; // 서버 commandSequence는 1-based
    setCurrentSeq(1);
    const { commandSet, players, clientStartAt } = useContributionStore.getState();
    setProgress({ current: 0, total: commandSet.length, percent: 0 });
    setScores(buildInitialScores(players, myPlayerId));

    const delayMs = Math.max(0, (clientStartAt ?? Date.now()) - Date.now());

    // 카운트다운 중 조기 종료(CONTRIBUTION_GAME_END) 수신 시 타이머를 취소하기 위한 플래그.
    // game:end가 타이머보다 먼저 도착하면 setGameStatus('playing')으로 'ended'를 덮어쓰는 것을 막는다.
    let gameEndedEarly = false;
    const unsubGameEnd = contributionBus.subscribe('game:end', () => {
      gameEndedEarly = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    });

    const triggerStart = () => {
      if (gameEndedEarly) return;
      setGameStatus('playing');
      contributionBus.emit('game:start');
      const { roomId: rId, sessionId: sid, players } = useContributionStore.getState();
      if (rId != null && sid) {
        analytics.contributionGameStarted({
          roomId: rId,
          sessionId: sid,
          playerCount: players.length,
        });
      }
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;
    if (delayMs <= 0) {
      triggerStart();
    } else {
      timerId = setTimeout(() => {
        timerId = null;
        triggerStart();
      }, delayMs);
    }

    return () => {
      if (timerId !== null) clearTimeout(timerId);
      unsubGameEnd();
      setGameStatus('idle');
    };
  }, [sessionId, myPlayerId, setGameStatus, setGameResult, setProgress, setScores, setCurrentSeq]);

  // 게임 채널 구독
  useEffect(() => {
    if (roomId == null || !sessionId) return;

    if (!accessToken) return;

    const GAME_KEY = `contribution:game:${roomId}`;
    const PRIVATE_KEY = 'contribution:private';

    socketManager.connect(accessToken);

    socketManager.subscribe(
      `/topic/room/${roomId}/contribution`,
      (message) =>
        handleContributionGameTopicMessage(message, {
          myPlayerId,
          store: useContributionStore.getState(),
          setScores,
          setProgress,
          setCurrentSeq,
          setGameResult,
          setGameStatus,
          currentSeqRef,
        }),
      GAME_KEY
    );

    socketManager.subscribe(
      '/user/queue/private',
      (message) =>
        handleContributionPrivateMessage(message, {
          onForceDisconnect,
          onKicked,
          onPrivateError,
        }),
      PRIVATE_KEY
    );

    return () => {
      socketManager.unsubscribe(GAME_KEY);
      socketManager.unsubscribe(PRIVATE_KEY);
      // socketManager는 공용 자원이므로 disconnect 호출 금지 (multi/useRoomSocket 패턴).
      // 다음 페이지(WaitingRoom 등)가 같은 소켓을 이어쓴다. disconnect는
      // FORCE_DISCONNECT/KICKED 같은 서버 명시 이벤트에서만 호출.
    };
  }, [
    roomId,
    sessionId,
    myPlayerId,
    accessToken,
    setGameStatus,
    setGameResult,
    setScores,
    setProgress,
    setCurrentSeq,
    onForceDisconnect,
    onKicked,
    onPrivateError,
  ]);

  // command:submit → WS 발행
  useEffect(() => {
    if (roomId == null || !sessionId) return;
    const unsub = contributionBus.subscribe('command:submit', ({ text, requestId }) => {
      const isSwitch = isSwitchCommand(text);
      socketManager.publish(`/app/room/${roomId}/contribution/commands`, {
        type: 'CONTRIBUTION_INPUT',
        requestId,
        gameSessionId: sessionId,
        ...(isSwitch ? {} : { commandSequence: currentSeqRef.current }),
        inputText: text,
      });
    });
    return unsub;
  }, [roomId, sessionId]);

  // command:expire → COMMAND_EXPIRE_REQUEST WS 발행
  useEffect(() => {
    if (roomId == null || !sessionId) return;
    const unsub = contributionBus.subscribe('command:expire', ({ commandSequence, requestId }) => {
      socketManager.publish(`/app/room/${roomId}/contribution/commands/expire`, {
        type: 'COMMAND_EXPIRE_REQUEST',
        requestId,
        gameSessionId: sessionId,
        commandSequence,
      });
    });
    return unsub;
  }, [roomId, sessionId]);
}
