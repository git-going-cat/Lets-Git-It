import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { socketManager, TERMINAL_AUTH_ERROR_CODES } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  CoopGameEndSchema,
  CoopInputCorrectSchema,
  CoopInputWrongSchema,
  CoopOrderWrongSchema,
  CoopResetWrongSchema,
  CoopRoundAssignSchema,
  CoopRoundRevealSchema,
} from '@/features/multi/schemas/coop.schema';
import { useRoomStore } from '@/features/multi/store/roomStore';

import { coopBus } from '../bridge/coopBus';
import { COOP_COMMANDS_PER_ROUND, COOP_TOTAL_COMMANDS } from '../constants/game';
import {
  coopCommandsAtom,
  coopMyCommandAtom,
  coopMyCommandCompletedAtom,
  coopMyCommandOrderAtom,
  coopPendingInputRequestIdsAtom,
} from '../store/coopCommandsAtom';
import {
  coopCompletedCountAtom,
  coopCurrentOrderAtom,
  coopGraphActiveSequenceAtom,
  coopGraphCompletedSequencesAtom,
  coopInputBlockedAtom,
  coopPhaseAtom,
  coopResetTargetPlayerIdAtom,
  coopRoundAtom,
  coopWrongPlayerNicknameAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom, coopPlayerStatsAtom } from '../store/coopPlayersAtom';
import { useCoopStore } from '../store/coopStore';
import { coopElapsedSecondsAtom } from '../store/coopTimerAtom';

import type { CoopCommandCard, CoopPlayer } from '../types/coop.types';

interface CoopGraphActivationNode {
  sequence: number;
  activateOnRound: number;
  activateOnStep: number;
}

function createInitialPlayerStats(players: CoopPlayer[]) {
  return Object.fromEntries(
    players.map((player) => [player.playerId, { typoCount: 0, resetCount: 0 }])
  );
}

function getMessageType(message: unknown) {
  if (typeof message !== 'object' || message === null || !('type' in message)) return null;
  return typeof message.type === 'string' ? message.type : null;
}

function getErrorCode(message: unknown) {
  if (typeof message !== 'object' || message === null || !('code' in message)) return null;
  return typeof message.code === 'string' ? message.code : null;
}

function isGraphActivationNode(node: unknown): node is CoopGraphActivationNode {
  if (typeof node !== 'object' || node === null) return false;
  const candidate = node as Record<string, unknown>;
  return (
    typeof candidate.sequence === 'number' &&
    typeof candidate.activateOnRound === 'number' &&
    typeof candidate.activateOnStep === 'number'
  );
}

function getGraphActivationNodes(graphData: unknown): CoopGraphActivationNode[] {
  if (typeof graphData !== 'object' || graphData === null) return [];
  const nodes = (graphData as Record<string, unknown>).nodes;
  return Array.isArray(nodes) ? nodes.filter(isGraphActivationNode) : [];
}

function getGraphNodeSequences(graphData: unknown): number[] {
  if (typeof graphData !== 'object' || graphData === null) return [];
  const nodes = (graphData as Record<string, unknown>).nodes;
  if (!Array.isArray(nodes)) return [];

  const sequences = nodes
    .map((node) => {
      if (typeof node !== 'object' || node === null) return null;
      const sequence = (node as Record<string, unknown>).sequence;
      return typeof sequence === 'number' ? sequence : null;
    })
    .filter((sequence): sequence is number => sequence !== null);

  return [...new Set(sequences)].sort((a, b) => a - b);
}

function getNodeSequencesByCommandProgress(
  graphData: unknown,
  completedCommands: number
): number[] {
  const nodeSequences = getGraphNodeSequences(graphData);
  if (nodeSequences.length === 0) return [];

  const completedNodeCount = Math.ceil(
    (Math.min(COOP_TOTAL_COMMANDS, Math.max(0, completedCommands)) / COOP_TOTAL_COMMANDS) *
      nodeSequences.length
  );

  return nodeSequences.slice(0, completedNodeCount);
}

function getCompletedNodeSequencesForProgress(
  graphData: unknown,
  round: number,
  stepInRound: number,
  sequence: number
): number[] {
  const activationNodes = getGraphActivationNodes(graphData);

  if (activationNodes.length > 0) {
    return [
      ...new Set(
        activationNodes
          .filter(
            (node) =>
              node.activateOnRound < round ||
              (node.activateOnRound === round && node.activateOnStep <= stepInRound)
          )
          .map((node) => node.sequence)
      ),
    ].sort((a, b) => a - b);
  }

  return getNodeSequencesByCommandProgress(graphData, sequence);
}

function getNodeSequencesBeforeRound(graphData: unknown, round: number): Set<number> {
  const activationNodes = getGraphActivationNodes(graphData);
  if (activationNodes.length > 0) {
    return new Set(
      activationNodes.filter((node) => node.activateOnRound < round).map((node) => node.sequence)
    );
  }

  return new Set(
    getNodeSequencesByCommandProgress(graphData, (round - 1) * COOP_COMMANDS_PER_ROUND)
  );
}

function toCoopPlayers(): CoopPlayer[] {
  const members = useRoomStore.getState().members;
  const { user } = useAuthStore.getState();
  const myMemberId = user?.memberId ?? null;
  const myNickname = user?.nickname ?? null;
  if (members.length === 0) {
    return useCoopStore.getState().playerSnapshots.length > 0
      ? useCoopStore.getState().playerSnapshots
      : [];
  }

  return members.slice(0, 4).map((member, index) => ({
    playerId: member.playerId,
    nickname: member.nickname,
    isMe:
      myMemberId !== null
        ? member.playerId === myMemberId
        : myNickname !== null && member.nickname === myNickname,
    commandOrder: index + 1,
    characterHair: member.characterHair,
    characterHairColor: member.characterHairColor,
    characterBody: member.characterBody,
    characterBodyColor: 'Body-color_01',
    characterEye: member.characterEye,
    characterOutfit: member.characterOutfit,
    characterOutfitColor: member.characterOutfitColor,
  }));
}

function toRevealTiming(revealStartsAt: number, serverTime: number) {
  const revealDurationMs = 3000;
  const revealDelayMs = Math.max(0, revealStartsAt - serverTime);
  const elapsedMs = Math.max(0, serverTime - revealStartsAt);
  return {
    revealKey: revealStartsAt,
    revealDelayMs,
    revealDurationMs: Math.max(0, revealDurationMs - elapsedMs),
  };
}

export function useCoopGame() {
  const commandsRef = useRef<CoopCommandCard[]>([]);
  const pendingAssignedCommandTextRef = useRef<string | null>(null);
  const gameEndFallbackTimerRef = useRef<number | null>(null);
  const pendingInputRequestIdsRef = useRef<Set<string>>(new Set());
  const playersRef = useRef<CoopPlayer[]>([]);
  const playerStatsRef = useRef<Record<string, { typoCount: number; resetCount: number }>>({});
  const sessionIdRef = useRef<string | null>(null);
  const graphDataRef = useRef<unknown>(null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const phase = useAtomValue(coopPhaseAtom);
  const players = useAtomValue(coopPlayersAtom);
  const playerStats = useAtomValue(coopPlayerStatsAtom);
  const setPhase = useSetAtom(coopPhaseAtom);
  const setRound = useSetAtom(coopRoundAtom);
  const setCompletedCount = useSetAtom(coopCompletedCountAtom);
  const setCurrentOrder = useSetAtom(coopCurrentOrderAtom);
  const setInputBlocked = useSetAtom(coopInputBlockedAtom);
  const setResetTargetPlayerId = useSetAtom(coopResetTargetPlayerIdAtom);
  const setWrongPlayerNickname = useSetAtom(coopWrongPlayerNicknameAtom);
  const setPlayers = useSetAtom(coopPlayersAtom);
  const setPlayerStats = useSetAtom(coopPlayerStatsAtom);
  const setCommands = useSetAtom(coopCommandsAtom);
  const setMyCommand = useSetAtom(coopMyCommandAtom);
  const setMyCommandOrder = useSetAtom(coopMyCommandOrderAtom);
  const setMyCommandCompleted = useSetAtom(coopMyCommandCompletedAtom);
  const pendingInputRequestIds = useAtomValue(coopPendingInputRequestIdsAtom);
  const setPendingInputRequestIds = useSetAtom(coopPendingInputRequestIdsAtom);
  const setElapsedSeconds = useSetAtom(coopElapsedSecondsAtom);
  const setGraphCompletedSequences = useSetAtom(coopGraphCompletedSequencesAtom);
  const setGraphActiveSequence = useSetAtom(coopGraphActiveSequenceAtom);
  const sessionId = useCoopStore((state) => state.sessionId);
  const roomId = useCoopStore((state) => state.roomId);
  const startAt = useCoopStore((state) => state.startAt);
  const graphData = useCoopStore((state) => state.graphData);
  const pendingMessages = useCoopStore((state) => state.pendingMessages);
  const consumePendingMessages = useCoopStore((state) => state.consumePendingMessages);
  const setPlayerSnapshots = useCoopStore((state) => state.setPlayerSnapshots);
  const setResult = useCoopStore((state) => state.setResult);
  const setSessionMeta = useCoopStore((state) => state.setSessionMeta);

  useEffect(() => {
    pendingInputRequestIdsRef.current = pendingInputRequestIds;
    playersRef.current = players;
    playerStatsRef.current = playerStats;
    sessionIdRef.current = sessionId;
    graphDataRef.current = graphData;
  }, [graphData, pendingInputRequestIds, playerStats, players, sessionId]);

  useEffect(
    () => () => {
      if (gameEndFallbackTimerRef.current !== null) {
        window.clearTimeout(gameEndFallbackTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const players = toCoopPlayers();
    setPlayers(players);
    setPlayerStats(createInitialPlayerStats(players));
    setPlayerSnapshots(players);
    commandsRef.current = [];
    pendingAssignedCommandTextRef.current = null;
    setCommands([]);
    setMyCommand(null);
    setMyCommandOrder(null);
    setMyCommandCompleted(false);
    setPendingInputRequestIds(new Set());
    setGraphCompletedSequences([]);
    setGraphActiveSequence(null);
    setSessionMeta({
      mapName: useRoomStore.getState().selectedMap?.mapName ?? null,
    });
  }, [
    setCommands,
    setGraphActiveSequence,
    setGraphCompletedSequences,
    setMyCommand,
    setMyCommandCompleted,
    setMyCommandOrder,
    setPendingInputRequestIds,
    setPlayerSnapshots,
    setPlayerStats,
    setPlayers,
    setSessionMeta,
  ]);

  useEffect(() => {
    if (phase === 'ended') return;
    if (startAt === null) return;

    const timerId = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [phase, setElapsedSeconds, startAt]);

  const applyAssignedCommand = useCallback(
    (myCommandText: string) => {
      const order =
        commandsRef.current.find((command) => command.commandText === myCommandText)
          ?.commandOrder ?? null;

      setMyCommand(myCommandText);
      setMyCommandOrder(order);
      setMyCommandCompleted(false);
      setPendingInputRequestIds(new Set());
      if (order !== null) {
        coopBus.emit('coop:assign-reveal', { myCommandOrder: order });
      }
    },
    [setMyCommand, setMyCommandCompleted, setMyCommandOrder, setPendingInputRequestIds]
  );

  const handleRoundReveal = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopRoundRevealSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_ROUND_REVEAL packet dropped.', result.error);
        }
        return;
      }

      setRound(result.data.round);
      setCompletedCount(0);
      setCurrentOrder(1);
      setInputBlocked(true);
      setResetTargetPlayerId(null);
      setWrongPlayerNickname(null);
      const commands = result.data.commands.map((command) => ({
        commandOrder: command.commandOrder,
        commandText: command.commandText,
      }));
      commandsRef.current = commands;
      setCommands(commands);
      setMyCommand(null);
      setMyCommandOrder(null);
      setMyCommandCompleted(false);
      setPendingInputRequestIds(new Set());
      if (result.data.isReset) {
        coopBus.emit('coop:input-clear');
      }
      if (pendingAssignedCommandTextRef.current !== null) {
        const pendingCommandText = pendingAssignedCommandTextRef.current;
        pendingAssignedCommandTextRef.current = null;
        applyAssignedCommand(pendingCommandText);
      }
      const previousRoundSequences = getNodeSequencesBeforeRound(
        graphDataRef.current,
        result.data.round
      );
      setGraphCompletedSequences((sequences) =>
        sequences.filter((sequence) => previousRoundSequences.has(sequence))
      );
      setGraphActiveSequence(null);
      setSessionMeta(toRevealTiming(result.data.revealStartsAt, result.data.serverTime));
      setPhase('reveal');
    },
    [
      applyAssignedCommand,
      setCommands,
      setCompletedCount,
      setCurrentOrder,
      setGraphActiveSequence,
      setGraphCompletedSequences,
      setInputBlocked,
      setMyCommand,
      setMyCommandCompleted,
      setMyCommandOrder,
      setPendingInputRequestIds,
      setPhase,
      setResetTargetPlayerId,
      setRound,
      setSessionMeta,
      setWrongPlayerNickname,
    ]
  );

  const handleRoundAssign = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopRoundAssignSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_ROUND_ASSIGN packet dropped.', result.error);
        }
        return;
      }

      if (commandsRef.current.length === 0) {
        pendingAssignedCommandTextRef.current = result.data.myCommandText;
        return;
      }

      applyAssignedCommand(result.data.myCommandText);
    },
    [applyAssignedCommand]
  );

  const handleGameEnd = useCallback(
    (message: unknown) => {
      if (gameEndFallbackTimerRef.current !== null) {
        window.clearTimeout(gameEndFallbackTimerRef.current);
        gameEndFallbackTimerRef.current = null;
      }
      const result = CoopGameEndSchema.safeParse(message);
      if (!result.success) {
        console.error('[coop] Invalid COOP_GAME_END packet dropped.', result.error);
        return;
      }

      const gameEnd = result.data;
      if (gameEnd.isSuccess === true && 'results' in gameEnd) {
        setPlayerStats((stats) => {
          const next = { ...stats };
          gameEnd.results.forEach((playerResult) => {
            next[playerResult.playerId] = {
              typoCount: playerResult.wrongTypeCount,
              resetCount: playerResult.wrongOrderCount,
            };
          });
          return next;
        });
      }

      setResult(gameEnd);
      setInputBlocked(true);
      setPhase('ended');
    },
    [setInputBlocked, setPhase, setPlayerStats, setResult]
  );

  const scheduleGameEndFallback = useCallback(() => {
    if (gameEndFallbackTimerRef.current !== null) return;

    gameEndFallbackTimerRef.current = window.setTimeout(() => {
      gameEndFallbackTimerRef.current = null;
      if (useCoopStore.getState().result !== null) return;

      console.warn('[COOP] COOP_GAME_END timeout. Showing result receive failure modal.');
      setResult({
        type: 'COOP_GAME_END',
        gameSessionId: sessionIdRef.current,
        serverTime: Date.now(),
        isSuccess: false,
        reason: 'RESULT_TIMEOUT',
        elapsedTime: null,
        results: null,
      });
      setInputBlocked(true);
      setPhase('ended');
    }, 30000);
  }, [setInputBlocked, setPhase, setResult]);

  const handleInputCorrect = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopInputCorrectSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_INPUT_CORRECT packet dropped.', result.error);
        }
        return;
      }

      if (pendingInputRequestIdsRef.current.has(result.data.requestId)) {
        setMyCommandCompleted(true);
        setPendingInputRequestIds((requestIds: Set<string>) => {
          const next = new Set(requestIds);
          next.delete(result.data.requestId);
          return next;
        });
      }

      setRound(result.data.round);
      setCompletedCount(Math.min(COOP_COMMANDS_PER_ROUND, result.data.stepInRound));
      setCurrentOrder(result.data.stepInRound + 1);
      setGraphCompletedSequences(
        getCompletedNodeSequencesForProgress(
          graphDataRef.current,
          result.data.round,
          result.data.stepInRound,
          result.data.sequence
        )
      );
      setGraphActiveSequence(null);

      if (result.data.isRoundComplete && result.data.sequence >= COOP_TOTAL_COMMANDS) {
        setInputBlocked(true);
        scheduleGameEndFallback();
      }
    },
    [
      scheduleGameEndFallback,
      setCompletedCount,
      setCurrentOrder,
      setGraphActiveSequence,
      setGraphCompletedSequences,
      setInputBlocked,
      setMyCommandCompleted,
      setPendingInputRequestIds,
      setRound,
    ]
  );

  const handleOrderWrong = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopOrderWrongSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_ORDER_WRONG packet dropped.', result.error);
        }
        return;
      }

      const isMe = playersRef.current.some(
        (player) => player.isMe && player.playerId === result.data.resetTargetPlayerId
      );

      if (pendingInputRequestIdsRef.current.has(result.data.requestId)) {
        setPendingInputRequestIds((requestIds: Set<string>) => {
          const next = new Set(requestIds);
          next.delete(result.data.requestId);
          return next;
        });
      }

      setPlayerStats((stats) => {
        const current = stats[result.data.resetTargetPlayerId] ?? {
          typoCount: 0,
          resetCount: 0,
        };
        return {
          ...stats,
          [result.data.resetTargetPlayerId]: {
            ...current,
            resetCount: current.resetCount + 1,
          },
        };
      });
      setInputBlocked(true);
      setResetTargetPlayerId(result.data.resetTargetPlayerId);
      setWrongPlayerNickname(result.data.nickname);
      setPhase(isMe ? 'reset_wait' : 'wrong');
      coopBus.emit('coop:screen-shake');
      if (isMe) {
        coopBus.emit('coop:input-wrong-shake');
      }
    },
    [
      setInputBlocked,
      setPendingInputRequestIds,
      setPhase,
      setPlayerStats,
      setResetTargetPlayerId,
      setWrongPlayerNickname,
    ]
  );

  const handleInputWrong = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopInputWrongSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_INPUT_WRONG packet dropped.', result.error);
        }
        return;
      }

      if (pendingInputRequestIdsRef.current.has(result.data.requestId)) {
        setPendingInputRequestIds((requestIds: Set<string>) => {
          const next = new Set(requestIds);
          next.delete(result.data.requestId);
          return next;
        });
      }

      setPlayerStats((stats) => {
        const current = stats[result.data.playerId] ?? {
          typoCount: 0,
          resetCount: 0,
        };
        return {
          ...stats,
          [result.data.playerId]: {
            ...current,
            typoCount: current.typoCount + 1,
          },
        };
      });
      coopBus.emit('coop:input-wrong-shake');
    },
    [setPendingInputRequestIds, setPlayerStats]
  );

  const handleResetWrong = useCallback(
    (message: unknown, shouldLogError = false) => {
      const result = CoopResetWrongSchema.safeParse(message);
      if (!result.success) {
        if (shouldLogError) {
          console.error('[coop] Invalid COOP_RESET_WRONG packet dropped.', result.error);
        }
        return;
      }

      const wrongPlayer = playersRef.current.find(
        (player) => player.playerId === result.data.playerId
      );
      const isMe = playersRef.current.some(
        (player) => player.isMe && player.playerId === result.data.playerId
      );

      setPlayerStats((stats) => {
        const current = stats[result.data.playerId] ?? {
          typoCount: 0,
          resetCount: 0,
        };
        return {
          ...stats,
          [result.data.playerId]: {
            ...current,
            typoCount: current.typoCount + 1,
          },
        };
      });
      setInputBlocked(true);
      setResetTargetPlayerId(result.data.playerId);
      setWrongPlayerNickname(wrongPlayer?.nickname ?? null);
      setPhase(isMe ? 'reset_wait' : 'wrong');
      coopBus.emit('coop:screen-shake');
    },
    [setInputBlocked, setPhase, setPlayerStats, setResetTargetPlayerId, setWrongPlayerNickname]
  );

  const handlePrivateError = useCallback(
    (message: unknown) => {
      const code = getErrorCode(message);
      if (code === 'GAME_ALREADY_ENDED') {
        setInputBlocked(true);
        return;
      }

      coopBus.emit('coop:input-wrong-shake');
    },
    [setInputBlocked]
  );

  useEffect(() => {
    if (!sessionId || roomId == null) return;
    if (pendingMessages.length === 0) return;

    const messages = consumePendingMessages();
    messages.forEach((message) => {
      switch (getMessageType(message)) {
        case 'COOP_ROUND_REVEAL': {
          handleRoundReveal(message);
          return;
        }

        case 'COOP_ROUND_ASSIGN': {
          handleRoundAssign(message);
          return;
        }

        case 'COOP_INPUT_CORRECT': {
          handleInputCorrect(message);
          return;
        }

        case 'COOP_ORDER_WRONG': {
          handleOrderWrong(message);
          return;
        }

        case 'COOP_INPUT_WRONG': {
          handleInputWrong(message);
          return;
        }

        case 'COOP_RESET_WRONG': {
          handleResetWrong(message);
          return;
        }

        case 'COOP_GAME_END': {
          handleGameEnd(message);
          return;
        }

        default:
          return;
      }
    });
  }, [
    consumePendingMessages,
    handleGameEnd,
    handleInputCorrect,
    handleInputWrong,
    handleOrderWrong,
    handleResetWrong,
    handleRoundAssign,
    handleRoundReveal,
    pendingMessages.length,
    roomId,
    sessionId,
  ]);

  useEffect(() => {
    if (!sessionId || roomId == null) return;
    if (!accessToken) return;

    const gameKey = `coop:game:${roomId}`;
    const privateKey = 'coop:private';

    socketManager.connect(accessToken);

    socketManager.subscribe(
      `/topic/room/${roomId}/coop`,
      (message) => {
        switch (getMessageType(message)) {
          case 'COOP_ROUND_REVEAL': {
            handleRoundReveal(message, true);
            return;
          }

          case 'COOP_INPUT_CORRECT': {
            handleInputCorrect(message, true);
            return;
          }

          case 'COOP_ORDER_WRONG': {
            handleOrderWrong(message, true);
            return;
          }

          case 'COOP_GAME_END': {
            handleGameEnd(message);
            return;
          }

          default:
            return;
        }
      },
      gameKey
    );

    socketManager.subscribe(
      '/user/queue/private',
      (message) => {
        switch (getMessageType(message)) {
          case 'COOP_ROUND_ASSIGN': {
            handleRoundAssign(message, true);
            return;
          }

          case 'COOP_INPUT_WRONG': {
            handleInputWrong(message, true);
            return;
          }

          case 'COOP_RESET_WRONG': {
            handleResetWrong(message, true);
            return;
          }

          case 'ERROR': {
            handlePrivateError(message);
            return;
          }

          default:
            return;
        }
      },
      privateKey
    );

    const removeConnectionListener = socketManager.addConnectionListener((event) => {
      if (event !== 'disconnected') return;

      const disconnectError = socketManager.getLastDisconnectError();
      if (!disconnectError || !TERMINAL_AUTH_ERROR_CODES.has(disconnectError.code)) return;
      if (useCoopStore.getState().result !== null) return;

      setInputBlocked(true);
      setResult({
        type: 'COOP_GAME_END',
        gameSessionId: sessionIdRef.current,
        serverTime: Date.now(),
        isSuccess: false,
        reason: disconnectError.code,
        elapsedTime: null,
        results: null,
      });
      setPhase('ended');
    });

    return () => {
      removeConnectionListener();
      socketManager.unsubscribe(gameKey);
      socketManager.unsubscribe(privateKey);
    };
  }, [
    accessToken,
    handleGameEnd,
    handleInputCorrect,
    handleInputWrong,
    handleOrderWrong,
    handlePrivateError,
    handleResetWrong,
    handleRoundAssign,
    handleRoundReveal,
    roomId,
    setInputBlocked,
    setPhase,
    setResult,
    sessionId,
  ]);
}
