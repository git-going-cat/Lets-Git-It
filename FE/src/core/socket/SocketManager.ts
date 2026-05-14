import { Client } from '@stomp/stompjs';

import { env } from '@/config/env';

import type { SocketMessageHandler } from '@/shared/types/socket.types';
import type { IMessage, StompSubscription } from '@stomp/stompjs';

const RECONNECT_DELAY_MS = 5000;
const INVALID_SOCKET_MESSAGE = Symbol('INVALID_SOCKET_MESSAGE');

type PendingSubscription = {
  callback: SocketMessageHandler;
  destination: string;
  key: string;
};

type ActiveSubscription = PendingSubscription & {
  stompSubscription: StompSubscription;
};

type ParsedSocketMessage = unknown | typeof INVALID_SOCKET_MESSAGE;

/**
 * STOMP over SockJS WebSocket 연결을 관리하는 싱글톤.
 *
 * 사용 방법:
 * 1. `socketManager.connect(token)` — 방 입장 시 1회 호출
 * 2. `socketManager.subscribe(destination, callback, key)` — 구독 등록 (연결 전에 호출해도 큐에 적재됨)
 * 3. `socketManager.publish(destination, body)` — 메시지 발행
 * 4. `socketManager.disconnect()` — 방 퇴장 시 호출
 */
class SocketManager {
  private client: Client | null = null;

  private isConnected = false;

  private isConnecting = false;

  private readonly connectCallbacks = new Set<() => void>();

  private readonly pendingSubscriptions = new Map<string, PendingSubscription>();

  private readonly subscriptions = new Map<string, ActiveSubscription>();

  /**
   * STOMP 클라이언트를 생성하고 WebSocket 연결을 시작한다.
   *
   * 이미 연결된 상태라면 onConnect만 즉시 호출하고 반환한다.
   * 연결 중이라면 onConnect를 큐에 등록하고 반환한다.
   *
   * @param token - Authorization 헤더에 포함할 Bearer 토큰
   * @param onConnect - 연결 완료 후 실행할 콜백 (선택)
   */
  connect(token: string, onConnect?: () => void): void {
    if (this.isConnected && this.client?.connected) {
      onConnect?.();
      return;
    }

    if (onConnect) {
      this.connectCallbacks.add(onConnect);
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const client = new Client({
      // TODO: 팀 공유 필요 — VITE_WS_URL에 /ws 경로가 포함되어 있는지 확인 필요.
      //       포함되지 않는다면 `env.WS_URL + '/ws'` 로 변경해야 한다.
      brokerURL: env.WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: RECONNECT_DELAY_MS,
    });

    client.onConnect = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      this.flushPendingSubscriptions();
      this.runConnectCallbacks();
    };

    client.onWebSocketClose = () => {
      this.isConnected = false;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      console.warn('[socket] WebSocket connection closed.');
    };

    client.onStompError = (frame) => {
      this.isConnected = false;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      console.error('[socket] STOMP error.', {
        body: frame.body,
        message: frame.headers.message,
      });
    };

    this.client = client;
    client.activate();
  }

  /**
   * STOMP 클라이언트를 비활성화하고 모든 구독·큐를 초기화한다.
   *
   * 방 퇴장 또는 FORCE_DISCONNECT 수신 시 호출한다.
   */
  disconnect(): void {
    this.pendingSubscriptions.clear();
    this.subscriptions.forEach((subscription) => {
      subscription.stompSubscription.unsubscribe();
    });
    this.subscriptions.clear();

    const currentClient = this.client;
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectCallbacks.clear();

    if (currentClient) {
      void currentClient.deactivate();
    }
  }

  /**
   * 지정한 destination을 구독하고 메시지를 callback으로 전달한다.
   *
   * - 연결 전이면 pendingSubscriptions 큐에 적재했다가 onConnect 시 자동 flush된다.
   * - 동일 key로 중복 호출하면 무시된다 (deduplication).
   * - 구독 해제는 `unsubscribe(key)`로 한다.
   *
   * @param destination - 구독할 STOMP destination (예: `/topic/room/1`, `/user/queue/private`)
   * @param callback - JSON 파싱된 메시지를 수신할 핸들러
   * @param key - 구독 식별자. 동일 키로 중복 구독을 방지한다.
   */
  subscribe(destination: string, callback: SocketMessageHandler, key: string): void {
    if (this.subscriptions.has(key) || this.pendingSubscriptions.has(key)) {
      return;
    }

    if (!this.connected) {
      this.pendingSubscriptions.set(key, { callback, destination, key });
      return;
    }

    this.addSubscription({ callback, destination, key });
  }

  /**
   * key에 해당하는 구독을 취소한다.
   *
   * 아직 연결되지 않아 큐에 있는 구독도 제거한다.
   *
   * @param key - `subscribe()` 호출 시 전달한 구독 식별자
   */
  unsubscribe(key: string): void {
    this.pendingSubscriptions.delete(key);

    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      return;
    }

    subscription.stompSubscription.unsubscribe();
    this.subscriptions.delete(key);
  }

  /**
   * STOMP 메시지를 발행한다. body는 JSON.stringify 후 전송된다.
   *
   * 연결 전이면 에러를 콘솔에 출력하고 발행을 중단한다.
   *
   * @param destination - 발행할 STOMP destination (예: `/app/room/1/ready`)
   * @param body - 전송할 payload 객체
   */
  publish(destination: string, body: Record<string, unknown>): void {
    if (!this.connected || !this.client) {
      console.error('[socket] Cannot publish before socket is connected.', { destination });
      return;
    }

    this.client.publish({
      body: JSON.stringify(body),
      destination,
    });
  }

  get connected(): boolean {
    return this.isConnected && (this.client?.connected ?? false);
  }

  private addSubscription({ callback, destination, key }: PendingSubscription): void {
    if (!this.client) {
      this.pendingSubscriptions.set(key, { callback, destination, key });
      return;
    }

    const subscription = this.client.subscribe(destination, (message) => {
      const parsed = this.parseMessage(message);

      if (parsed === INVALID_SOCKET_MESSAGE) {
        return;
      }

      callback(parsed);
    });

    this.subscriptions.set(key, { callback, destination, key, stompSubscription: subscription });
  }

  private flushPendingSubscriptions(): void {
    const pending = Array.from(this.pendingSubscriptions.values());
    this.pendingSubscriptions.clear();

    pending.forEach((subscription) => {
      if (!this.subscriptions.has(subscription.key)) {
        this.addSubscription(subscription);
      }
    });
  }

  private queueActiveSubscriptionsForReconnect(): void {
    const activeSubscriptions = Array.from(this.subscriptions.values());
    this.subscriptions.clear();

    activeSubscriptions.forEach(({ callback, destination, key }) => {
      if (!this.pendingSubscriptions.has(key)) {
        this.pendingSubscriptions.set(key, { callback, destination, key });
      }
    });
  }

  private parseMessage(message: IMessage): ParsedSocketMessage {
    if (!message.body) {
      return undefined;
    }

    try {
      return JSON.parse(message.body) as unknown;
    } catch (error) {
      console.error('[socket] Invalid JSON packet dropped.', error);
      return INVALID_SOCKET_MESSAGE;
    }
  }

  private runConnectCallbacks(): void {
    const callbacks = Array.from(this.connectCallbacks);
    this.connectCallbacks.clear();

    callbacks.forEach((callback) => {
      callback();
    });
  }
}

export const socketManager = new SocketManager();
