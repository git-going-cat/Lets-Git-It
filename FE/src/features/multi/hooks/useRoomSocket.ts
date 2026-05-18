import { useCallback, useEffect, useRef, useState } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCoopStore } from '@/features/coop/store/coopStore';

import { getRoomState } from '../api/room.api';
import { handleRoomPrivateMessage, handleRoomTopicMessage } from '../handlers/roomSocketHandlers';
import {
  baseMessageSchema,
  contributionStartedSchema,
  coopStartedSchema,
  errorSchema,
  forceDisconnectSchema,
  kickedSchema,
} from '../schemas/room.schema';
import { useRoomStore } from '../store/roomStore';

import type { ContributionStartedMessage, CoopStartedMessage } from '../schemas/room.schema';

const topicKey = (roomId: number) => `room-topic-${roomId}`;
const contributionGameKey = (roomId: number) => `room-contribution-start-${roomId}`;
const coopGameKey = (roomId: number) => `room-coop-start-${roomId}`;
const PRIVATE_KEY = 'room-private';

const REST_FALLBACK_DELAY_MS = 3_000;
const RECONNECTED_BANNER_MS = 2_000;
const BLOCKING_ESCALATION_MS = 10_000;
const FORCE_DISCONNECT_CODES = new Set(['LOGGED_OUT', 'REPLACED_BY_NEW_LOGIN']);
const COOP_RUNTIME_MESSAGE_TYPES = new Set([
  'COOP_ROUND_REVEAL',
  'COOP_ROUND_ASSIGN',
  'COOP_INPUT_WRONG',
  'COOP_RESET_WRONG',
  'COOP_ORDER_WRONG',
  'COOP_INPUT_CORRECT',
  'COOP_GAME_END',
]);

function getMessageType(message: unknown) {
  if (typeof message !== 'object' || message === null || !('type' in message)) return null;
  return typeof message.type === 'string' ? message.type : null;
}

/**
 * ?곌껐 ?곹깭
 * - `idle`         ???뺤긽 ?곌껐 以? * - `disconnected` ???ㅽ듃?뚰겕 ?⑥젅 (?몃? 諛곕꼫, 10珥??대궡)
 * - `reconnected`  ??諛⑷툑 ?ъ뿰寃??깃났 (珥덈줉 諛곕꼫, 2珥???idle)
 * - `blocking`     ??蹂듭썝 ?꾩슂 ?ㅻ쾭?덉씠 (?섏씠吏 ?덈줈怨좎묠 ?먮뒗 10珥? ?⑥젅)
 */
export type RoomConnectionStatus = 'idle' | 'disconnected' | 'reconnected' | 'blocking';

type PrivateQueueHandlers = {
  onForceDisconnect?: () => void;
  onKicked?: (roomId: number) => void;
  onPrivateError?: (code: string, message: string) => void;
};

type GameStartHandlers = {
  onContributionStarted?: (message: ContributionStartedMessage) => void;
  onCoopStarted?: (message: CoopStartedMessage) => void;
};

/**
 * 諛??湲곗떎 WebSocket ?곌껐 쨌 援щ룆??愿由ы븳??
 *
 * ## ?ъ뿰寃??먮쫫
 *
 * ### ?섏씠吏 ?덈줈怨좎묠
 * - store??title???놁쑝硫?`blocking` ?곹깭濡??쒖옉
 * - 援щ룆 吏곹썑 ?쒕쾭 ?먮룞 ?꾩넚 `CONTRIBUTION/COOP_ROOM_STATE` 瑜?3珥??湲? * - 3珥???誘몄닔????REST fallback ?몄텧
 * - 蹂듭썝 ??`roomState === 'IN_GAME'`?대㈃ `onReconnectComplete('IN_GAME')` ?몄텧
 *
 * ### ?ㅽ듃?뚰겕 ?⑥젅
 * - ?⑥젅 媛먯? 利됱떆 `disconnected` ?곹깭 (?몃? 諛곕꼫)
 * - 10珥??대궡 蹂듭썝: `reconnected` (珥덈줉 諛곕꼫 2珥? ??`idle`
 * - 10珥?珥덇낵: `blocking` ?ㅻ쾭?덉씠濡?寃⑹긽 + ROOM_STATE ?ъ닔???湲? */
export function useRoomSocket(
  roomId: number,
  onReconnectComplete?: (roomState: string | null) => void,
  privateQueueHandlers: PrivateQueueHandlers = {},
  gameStartHandlers: GameStartHandlers = {}
) {
  const initialRoomState = useRoomStore.getState();
  const isPreviewReconnect =
    initialRoomState.roomId === roomId &&
    Boolean(initialRoomState.title) &&
    initialRoomState.roomCode === null &&
    initialRoomState.maxPlayers === 0;
  const needsInitialRestore = !initialRoomState.title || isPreviewReconnect;

  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>(() =>
    needsInitialRestore ? 'blocking' : 'idle'
  );

  const onReconnectCompleteRef = useRef(onReconnectComplete);
  const privateQueueHandlersRef = useRef(privateQueueHandlers);
  const gameStartHandlersRef = useRef(gameStartHandlers);
  useEffect(() => {
    onReconnectCompleteRef.current = onReconnectComplete;
  }, [onReconnectComplete]);
  useEffect(() => {
    privateQueueHandlersRef.current = privateQueueHandlers;
  }, [privateQueueHandlers]);
  useEffect(() => {
    gameStartHandlersRef.current = gameStartHandlers;
  }, [gameStartHandlers]);

  // ROOM_STATE 蹂듭썝???꾩슂???곹깭?몄? 異붿쟻
  const needsRestoreRef = useRef(needsInitialRestore);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 理쒖큹 ?곌껐 ?꾨즺 ?щ? (珥덇린 connect ?댁쟾 disconnect ?대깽??臾댁떆??
  const hasEverConnectedRef = useRef(false);

  const clearFallbackTimer = useCallback(() => {
    if (!fallbackTimerRef.current) return;
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  const scheduleRestFallback = useCallback(() => {
    clearFallbackTimer();
    fallbackTimerRef.current = setTimeout(() => {
      if (!needsRestoreRef.current) return;

      void (async () => {
        let restoredRoomState: string | null = null;
        try {
          const state = await getRoomState(roomId);
          if (!needsRestoreRef.current) return; // WS媛 癒쇱? ?꾩갑??寃쎌슦 race guard
          if (state.type === 'CONTRIBUTION_ROOM_STATE') {
            useRoomStore.getState().initFromContributionRoomState(state);
          } else {
            useRoomStore.getState().initFromCoopRoomState(state);
          }
          restoredRoomState = state.roomState;
        } catch {
          // ?ㅽ뙣 ??null濡?onReconnectComplete ?몄텧
        }
        needsRestoreRef.current = false;
        fallbackTimerRef.current = null;
        setConnectionStatus('idle');
        onReconnectCompleteRef.current?.(restoredRoomState); // null = 蹂듭썝 ?ㅽ뙣
      })();
    }, REST_FALLBACK_DELAY_MS);
  }, [clearFallbackTimer, roomId]);

  // ?? Effect 1: WS 援щ룆 + ?섏씠吏 ?덈줈怨좎묠 REST fallback ??????????
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    socketManager.connect(token);

    // 1. 媛쒖씤 ?먮? 癒쇱? 援щ룆 (ROOM_STATE ?좊땲罹먯뒪???섏떊)
    socketManager.subscribe(
      '/user/queue/private',
      (raw) => {
        const baseMessage = baseMessageSchema.safeParse(raw);
        if (!baseMessage.success) {
          console.error('[WS] 媛쒖씤 ??硫붿떆吏 ?뚯떛 ?ㅽ뙣:', baseMessage.error);
          return;
        }

        switch (baseMessage.data.type) {
          case 'CONTRIBUTION_ROOM_STATE':
          case 'COOP_ROOM_STATE': {
            const msg = handleRoomPrivateMessage(raw, useRoomStore.getState());
            if (needsRestoreRef.current && msg !== null) {
              needsRestoreRef.current = false;
              clearFallbackTimer();
              setConnectionStatus('idle');
              const restoredRoomState = useRoomStore.getState().roomState ?? '';
              onReconnectCompleteRef.current?.(restoredRoomState);
            }
            return;
          }

          case 'FORCE_DISCONNECT': {
            const result = forceDisconnectSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid FORCE_DISCONNECT packet dropped.', result.error);
              return;
            }
            if (!FORCE_DISCONNECT_CODES.has(result.data.code)) return;
            socketManager.disconnect();
            privateQueueHandlersRef.current.onForceDisconnect?.();
            return;
          }

          case 'KICKED': {
            const result = kickedSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid KICKED packet dropped.', result.error);
              return;
            }
            socketManager.disconnect();
            privateQueueHandlersRef.current.onKicked?.(result.data.roomId);
            return;
          }

          case 'ERROR': {
            const result = errorSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid ERROR packet dropped.', result.error);
              return;
            }
            console.error('[socket] Private channel error.', {
              code: result.data.code,
              message: result.data.message,
            });
            privateQueueHandlersRef.current.onPrivateError?.(result.data.code, result.data.message);
            return;
          }

          default:
            if (COOP_RUNTIME_MESSAGE_TYPES.has(baseMessage.data.type)) {
              useCoopStore.getState().enqueuePendingMessage(raw);
            }
            return;
        }
      },
      PRIVATE_KEY
    );

    // 2. 諛??꾩껜 topic? ?몃━嫄곗슜?쇰줈 援щ룆 (釉뚮줈?쒖틦?ㅽ듃 ?대깽?몃쭔)
    socketManager.subscribe(
      `/topic/room/${roomId}`,
      (raw) => {
        handleRoomTopicMessage(raw, useRoomStore.getState());
      },
      topicKey(roomId)
    );

    socketManager.subscribe(
      `/topic/room/${roomId}/contribution`,
      (raw) => {
        const result = contributionStartedSchema.safeParse(raw);
        if (!result.success) {
          console.error('[WS] CONTRIBUTION_STARTED ?뚯떛 ?ㅽ뙣:', result.error);
          return;
        }
        needsRestoreRef.current = false;
        clearFallbackTimer();
        setConnectionStatus('idle');
        gameStartHandlersRef.current.onContributionStarted?.(result.data);
      },
      contributionGameKey(roomId)
    );

    socketManager.subscribe(
      `/topic/room/${roomId}/coop`,
      (raw) => {
        const messageType = getMessageType(raw);
        if (messageType !== 'COOP_STARTED' && COOP_RUNTIME_MESSAGE_TYPES.has(messageType ?? '')) {
          useCoopStore.getState().enqueuePendingMessage(raw);
          return;
        }

        const result = coopStartedSchema.safeParse(raw);
        if (!result.success) {
          console.error('[WS] COOP_STARTED 파싱 실패:', result.error);
          return;
        }
        needsRestoreRef.current = false;
        clearFallbackTimer();
        setConnectionStatus('idle');
        gameStartHandlersRef.current.onCoopStarted?.(result.data);
      },
      coopGameKey(roomId)
    );

    // REST fallback: WS ROOM_STATE가 필요한 복원 상황에서만 실행한다.
    if (needsRestoreRef.current) {
      scheduleRestFallback();
    }

    return () => {
      socketManager.unsubscribe(topicKey(roomId));
      socketManager.unsubscribe(contributionGameKey(roomId));
      socketManager.unsubscribe(coopGameKey(roomId));
      socketManager.unsubscribe(PRIVATE_KEY);
      clearFallbackTimer();
    };
  }, [clearFallbackTimer, roomId, scheduleRestFallback]);

  // ?? Effect 2: ?ㅽ듃?뚰겕 ?⑥젅 / ?ъ뿰寃?媛먯? ??????????????????????
  useEffect(() => {
    const removeListener = socketManager.addConnectionListener((event) => {
      if (event === 'connected') {
        hasEverConnectedRef.current = true;

        // 寃⑹긽 ??대㉧ 痍⑥냼
        if (escalationTimerRef.current) {
          clearTimeout(escalationTimerRef.current);
          escalationTimerRef.current = null;
        }

        setConnectionStatus((prev) => {
          if (prev === 'disconnected') {
            // 珥덈줉 諛곕꼫 2珥???idle
            if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
            reconnectedBannerTimerRef.current = setTimeout(() => {
              setConnectionStatus('idle');
            }, RECONNECTED_BANNER_MS);
            return 'reconnected';
          }
          // blocking(10珥?寃⑹긽)??寃쎌슦: ROOM_STATE ?섏떊?쇰줈 泥섎━ (needsRestoreRef)
          return prev;
        });
      } else {
        // disconnected
        if (!hasEverConnectedRef.current) return; // 珥덇린 ?곌껐 ??臾댁떆
        if (needsRestoreRef.current) return; // ?대? blocking (?덈줈怨좎묠)

        setConnectionStatus('disconnected');

        // 10珥???blocking?쇰줈 寃⑹긽
        if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
        escalationTimerRef.current = setTimeout(() => {
          needsRestoreRef.current = true;
          setConnectionStatus('blocking');
          scheduleRestFallback();
        }, BLOCKING_ESCALATION_MS);
      }
    });

    return () => {
      removeListener();
      if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
      clearFallbackTimer();
      if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
    };
  }, [clearFallbackTimer, scheduleRestFallback]);

  const publishReady = (isReady: boolean) =>
    socketManager.publish(`/app/room/${roomId}/ready`, {
      type: 'READY_UPDATE',
      isReady,
    });

  const publishStart = () =>
    socketManager.publish(`/app/room/${roomId}/start`, {
      type: 'GAME_START',
    });

  const publishHostTransfer = (nextHostId: string) =>
    socketManager.publish(`/app/room/${roomId}/transfer-host`, {
      type: 'HOST_TRANSFER_REQUEST',
      nextHostId,
    });

  const publishChat = (message: string) =>
    socketManager.publish(`/app/room/${roomId}/chat`, {
      type: 'CHAT_REQUEST',
      message,
    });

  return { publishReady, publishStart, publishHostTransfer, publishChat, connectionStatus };
}
