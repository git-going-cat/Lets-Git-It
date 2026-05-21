import { useEffect, useRef } from 'react';

import { socketManager } from '@/core/socket/SocketManager';

import { roomTopicMessageSchema } from '../schemas/room.schema';
import { useRoomStore } from '../store/roomStore';

import type { PlayerLeftMessage } from '../types/room.socket.types';

type UseInGameRoomEventsOptions = {
  roomId: number | null;
  onPlayerLeft?: (message: PlayerLeftMessage) => void;
};

const inGameRoomTopicKey = (roomId: number) => `in-game-room-topic-${roomId}`;

/**
 * 게임 화면에서 방 topic 이벤트를 구독한다.
 * 대기실 소켓 훅이 언마운트된 뒤에도 PLAYER_LEFT 같은 방 이벤트를 반영하기 위한 보조 훅이다.
 */
export function useInGameRoomEvents({ roomId, onPlayerLeft }: UseInGameRoomEventsOptions) {
  const onPlayerLeftRef = useRef(onPlayerLeft);

  useEffect(() => {
    onPlayerLeftRef.current = onPlayerLeft;
  }, [onPlayerLeft]);

  useEffect(() => {
    if (roomId === null) return;

    const key = inGameRoomTopicKey(roomId);
    socketManager.subscribe(
      `/topic/room/${roomId}`,
      (raw) => {
        const result = roomTopicMessageSchema.safeParse(raw);
        if (!result.success) return;

        if ('remainMembers' in result.data) {
          useRoomStore.getState().setMembers(result.data.remainMembers);
        } else if ('allMembers' in result.data) {
          useRoomStore.getState().setMembers(result.data.allMembers);
        }

        if (result.data.type === 'PLAYER_LEFT') {
          onPlayerLeftRef.current?.(result.data);
        }
      },
      key
    );

    return () => {
      socketManager.unsubscribe(key);
    };
  }, [roomId]);
}
