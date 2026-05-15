import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';

import { socketManager } from '@/core/socket/SocketManager';
import {
  CoopGameEndSchema,
  CoopInputCorrectSchema,
  CoopInputWrongSchema,
  CoopOrderWrongSchema,
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
  coopGraphImageUrlAtom,
  coopInputBlockedAtom,
  coopPhaseAtom,
  coopResetTargetPlayerIdAtom,
  coopRoundAtom,
  coopWrongPlayerNicknameAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom } from '../store/coopPlayersAtom';
import { useCoopStore } from '../store/coopStore';
import { coopElapsedSecondsAtom } from '../store/coopTimerAtom';

import type { CoopCommandCard, CoopPlayer } from '../types/coop.types';

const MOCK_PLAYERS: CoopPlayer[] = [
  {
    playerId: 'mock-player-1',
    nickname: 'Dobby',
    isMe: true,
    commandOrder: 1,
    characterHair: 'Hairstyle_01',
    characterHairColor: 'Hairstyle-color_01',
    characterBody: 'Body_01',
    characterBodyColor: 'Body-color_01',
    characterEye: 'Eyes_01',
    characterOutfit: 'Outfit_01',
    characterOutfitColor: 'Outfit-color_01',
  },
  {
    playerId: 'mock-player-2',
    nickname: 'GitCat',
    isMe: false,
    commandOrder: 2,
    characterHair: 'Hairstyle_02',
    characterHairColor: 'Hairstyle-color_02',
    characterBody: 'Body_02',
    characterBodyColor: 'Body-color_01',
    characterEye: 'Eyes_02',
    characterOutfit: 'Outfit_02',
    characterOutfitColor: 'Outfit-color_01',
  },
  {
    playerId: 'mock-player-3',
    nickname: 'Branch',
    isMe: false,
    commandOrder: 3,
    characterHair: 'Hairstyle_03',
    characterHairColor: 'Hairstyle-color_03',
    characterBody: 'Body_03',
    characterBodyColor: 'Body-color_01',
    characterEye: 'Eyes_03',
    characterOutfit: 'Outfit_03',
    characterOutfitColor: 'Outfit-color_01',
  },
  {
    playerId: 'mock-player-4',
    nickname: 'Merge',
    isMe: false,
    commandOrder: 4,
    characterHair: 'Hairstyle_04',
    characterHairColor: 'Hairstyle-color_04',
    characterBody: 'Body_04',
    characterBodyColor: 'Body-color_01',
    characterEye: 'Eyes_04',
    characterOutfit: 'Outfit_04',
    characterOutfitColor: 'Outfit-color_01',
  },
];

const MOCK_COMMANDS: CoopCommandCard[] = [
  { commandOrder: 1, commandText: 'git init' },
  { commandOrder: 2, commandText: 'git add .' },
  { commandOrder: 3, commandText: 'git commit -m "init"' },
  { commandOrder: 4, commandText: 'git push origin main' },
];

const COOP_GAME_TOPIC_TODO = '/topic/coop/{gameSessionId}';

function getMessageType(message: unknown) {
  if (typeof message !== 'object' || message === null || !('type' in message)) return null;
  return typeof message.type === 'string' ? message.type : null;
}

function toCoopPlayers(): CoopPlayer[] {
  const members = useRoomStore.getState().members;
  if (members.length === 0) {
    return useCoopStore.getState().playerSnapshots.length > 0
      ? useCoopStore.getState().playerSnapshots
      : MOCK_PLAYERS;
  }

  return members.slice(0, 4).map((member, index) => ({
    playerId: member.playerId,
    nickname: member.nickname,
    isMe: member.isMe,
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

/** 협력 게임 WebSocket 이벤트와 React/Jotai 상태를 연결합니다. */
export function useCoopGame() {
  const navigate = useNavigate();
  const setPhase = useSetAtom(coopPhaseAtom);
  const setRound = useSetAtom(coopRoundAtom);
  const setCompletedCount = useSetAtom(coopCompletedCountAtom);
  const setCurrentOrder = useSetAtom(coopCurrentOrderAtom);
  const setInputBlocked = useSetAtom(coopInputBlockedAtom);
  const setResetTargetPlayerId = useSetAtom(coopResetTargetPlayerIdAtom);
  const setWrongPlayerNickname = useSetAtom(coopWrongPlayerNicknameAtom);
  const setPlayers = useSetAtom(coopPlayersAtom);
  const setCommands = useSetAtom(coopCommandsAtom);
  const setMyCommand = useSetAtom(coopMyCommandAtom);
  const setMyCommandOrder = useSetAtom(coopMyCommandOrderAtom);
  const setElapsedSeconds = useSetAtom(coopElapsedSecondsAtom);
  const setGraphImageUrl = useSetAtom(coopGraphImageUrlAtom);
  const { sessionId, setPlayerSnapshots, setSessionMeta } = useCoopStore();

  useEffect(() => {
    const players = toCoopPlayers();
    setPlayers(players);
    setPlayerSnapshots(players);
    setCommands(MOCK_COMMANDS);
    setMyCommand(null);
    setMyCommandOrder(1);
    setGraphImageUrl(null);
    setSessionMeta({
      roomId: useRoomStore.getState().roomId,
      mapName: useRoomStore.getState().selectedMap?.mapName ?? null,
    });
  }, [
    setCommands,
    setGraphImageUrl,
    setMyCommand,
    setMyCommandOrder,
    setPlayerSnapshots,
    setPlayers,
    setSessionMeta,
  ]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [setElapsedSeconds]);

  useEffect(() => {
    return coopBus.subscribe('coop:assign-complete', () => {
      setPhase('input');
      setInputBlocked(false);
    });
  }, [setInputBlocked, setPhase]);

  useEffect(() => {
    if (!sessionId) return;

    // TODO: BE와 협력 게임 topic destination 확정 후 실제 경로로 교체.
    socketManager.subscribe(
      COOP_GAME_TOPIC_TODO.replace('{gameSessionId}', sessionId),
      (message) => {
        switch (getMessageType(message)) {
          case 'COOP_ROUND_REVEAL': {
            const result = CoopRoundRevealSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_ROUND_REVEAL packet dropped.', result.error);
              return;
            }

            setRound(result.data.round);
            setCompletedCount(0);
            setCurrentOrder(1);
            setInputBlocked(true);
            setResetTargetPlayerId(null);
            setWrongPlayerNickname(null);
            setCommands(
              result.data.commands.map((command) => ({
                commandOrder: command.commandOrder,
                commandText: command.commandText,
              }))
            );
            setPhase('reveal');
            return;
          }

          case 'COOP_ROUND_ASSIGN': {
            const result = CoopRoundAssignSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_ROUND_ASSIGN packet dropped.', result.error);
              return;
            }

            const order =
              useRoomStore.getState().members.find((member) => member.isMe)?.isMe === true
                ? toCoopPlayers().find((player) => player.isMe)?.commandOrder
                : 1;

            setMyCommand(result.data.myCommandText);
            setMyCommandOrder(order ?? 1);
            coopBus.emit('coop:assign-reveal', { myCommandOrder: order ?? 1 });
            return;
          }

          case 'COOP_INPUT_CORRECT': {
            const result = CoopInputCorrectSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_INPUT_CORRECT packet dropped.', result.error);
              return;
            }

            setCompletedCount((count) => Math.min(4, count + 1));
            setCurrentOrder(result.data.sequence + 1);
            return;
          }

          case 'COOP_INPUT_WRONG': {
            const result = CoopInputWrongSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_INPUT_WRONG packet dropped.', result.error);
              return;
            }

            coopBus.emit('coop:input-wrong-shake');
            return;
          }

          case 'COOP_ORDER_WRONG': {
            const result = CoopOrderWrongSchema.safeParse(message);
            if (!result.success) {
              console.error('[coop] Invalid COOP_ORDER_WRONG packet dropped.', result.error);
              return;
            }

            const isMe = toCoopPlayers().some(
              (player) => player.isMe && player.playerId === result.data.resetTargetPlayerId
            );
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

            void navigate({ to: '/home' });
            return;
          }

          default:
            return;
        }
      },
      `coop:game:${sessionId}`
    );

    return () => socketManager.unsubscribe(`coop:game:${sessionId}`);
  }, [
    navigate,
    sessionId,
    setCommands,
    setCompletedCount,
    setCurrentOrder,
    setInputBlocked,
    setMyCommand,
    setMyCommandOrder,
    setPhase,
    setResetTargetPlayerId,
    setRound,
    setWrongPlayerNickname,
  ]);
}
