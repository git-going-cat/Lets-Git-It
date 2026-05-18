import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { socketManager } from '@/core/socket/SocketManager';
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
import {
  coopCommandsAtom,
  coopMyCommandAtom,
  coopMyCommandOrderAtom,
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

const COMMANDS_PER_ROUND = 4;

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

function toRevealTiming(revealStartsAt: number) {
  const revealDurationMs = 3000;
  const now = Date.now();
  const revealDelayMs = Math.max(0, revealStartsAt - now);
  const elapsedMs = Math.max(0, now - revealStartsAt);
  return {
    revealKey: Date.now(),
    revealDelayMs,
    revealDurationMs: Math.max(0, revealDurationMs - elapsedMs),
  };
}

export function useCoopGame() {
  const commandsRef = useRef<CoopCommandCard[]>([]);
  const accessToken = useAuthStore((state) => state.accessToken);
  const phase = useAtomValue(coopPhaseAtom);
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
  const setElapsedSeconds = useSetAtom(coopElapsedSecondsAtom);
  const setGraphCompletedSequences = useSetAtom(coopGraphCompletedSequencesAtom);
  const setGraphActiveSequence = useSetAtom(coopGraphActiveSequenceAtom);
  const {
    sessionId,
    roomId,
    pendingMessages,
    consumePendingMessages,
    setPlayerSnapshots,
    setResult,
    setSessionMeta,
  } = useCoopStore();

  useEffect(() => {
    const players = toCoopPlayers();
    setPlayers(players);
    setPlayerStats(createInitialPlayerStats(players));
    setPlayerSnapshots(players);
    commandsRef.current = [];
    setCommands([]);
    setMyCommand(null);
    setMyCommandOrder(null);
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
    setMyCommandOrder,
    setPlayerSnapshots,
    setPlayerStats,
    setPlayers,
    setSessionMeta,
  ]);

  useEffect(() => {
    if (phase === 'ended') return;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [phase, setElapsedSeconds]);

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
      const firstSequenceInRound = (result.data.round - 1) * COMMANDS_PER_ROUND + 1;
      setGraphCompletedSequences((sequences) =>
        sequences.filter((sequence) => sequence < firstSequenceInRound)
      );
      setGraphActiveSequence(firstSequenceInRound);
      setSessionMeta(toRevealTiming(result.data.revealStartsAt));
      setPhase('reveal');
    },
    [
      setCommands,
      setCompletedCount,
      setCurrentOrder,
      setGraphActiveSequence,
      setGraphCompletedSequences,
      setInputBlocked,
      setMyCommand,
      setMyCommandOrder,
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

      const order =
        commandsRef.current.find((command) => command.commandText === result.data.myCommandText)
          ?.commandOrder ?? null;

      setMyCommand(result.data.myCommandText);
      setMyCommandOrder(order);
      if (order !== null) {
        coopBus.emit('coop:assign-reveal', { myCommandOrder: order });
      }
    },
    [setMyCommand, setMyCommandOrder]
  );

  useEffect(() => {
    if (!sessionId || roomId == null) return;

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

        default:
          return;
      }
    });
  }, [
    consumePendingMessages,
    handleRoundAssign,
    handleRoundReveal,
    pendingMessages,
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
            const result = CoopInputCorrectSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_INPUT_CORRECT packet dropped.', result.error);
              return;
            }

            setRound(result.data.round);
            setCompletedCount(Math.min(4, result.data.stepInRound));
            setCurrentOrder(result.data.stepInRound + 1);
            setGraphCompletedSequences((sequences) =>
              sequences.includes(result.data.sequence)
                ? sequences
                : [...sequences, result.data.sequence]
            );
            setGraphActiveSequence(result.data.isRoundComplete ? null : result.data.sequence + 1);
            return;
          }

          case 'COOP_ORDER_WRONG': {
            const result = CoopOrderWrongSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_ORDER_WRONG packet dropped.', result.error);
              return;
            }

            const isMe = useAuthStore.getState().user?.memberId === result.data.resetTargetPlayerId;
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
            return;
          }

          case 'COOP_GAME_END': {
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
              setResult(gameEnd);
              setInputBlocked(true);
              setPhase('ended');
              return;
            }

            setResult(gameEnd);
            setInputBlocked(true);
            setPhase('ended');
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
            const result = CoopInputWrongSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_INPUT_WRONG packet dropped.', result.error);
              return;
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
            return;
          }

          case 'COOP_RESET_WRONG': {
            const result = CoopResetWrongSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_RESET_WRONG packet dropped.', result.error);
              return;
            }

            const wrongPlayer = toCoopPlayers().find(
              (player) => player.playerId === result.data.playerId
            );
            const isMe = useAuthStore.getState().user?.memberId === result.data.playerId;

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
            return;
          }

          case 'ERROR': {
            const code = getErrorCode(message);
            if (code === 'GAME_ALREADY_ENDED') {
              setInputBlocked(true);
              return;
            }

            coopBus.emit('coop:input-wrong-shake');
            return;
          }

          default:
            return;
        }
      },
      privateKey
    );

    return () => {
      socketManager.unsubscribe(gameKey);
      socketManager.unsubscribe(privateKey);
    };
  }, [
    accessToken,
    handleRoundAssign,
    handleRoundReveal,
    roomId,
    sessionId,
    setCompletedCount,
    setCurrentOrder,
    setGraphActiveSequence,
    setGraphCompletedSequences,
    setInputBlocked,
    setPlayerStats,
    setResult,
    setPhase,
    setResetTargetPlayerId,
    setRound,
    setWrongPlayerNickname,
  ]);
}
