import { Client } from '@stomp/stompjs';

import { env } from '@/config/env';

import type { SocketMessageHandler } from '@/shared/types/socket.types';
import type { IMessage, StompSubscription } from '@stomp/stompjs';

const RECONNECT_DELAY_MS = 5000;
const INVALID_SOCKET_MESSAGE = Symbol('INVALID_SOCKET_MESSAGE');

type ConnectionEvent = 'connected' | 'disconnected';
type ConnectionListener = (event: ConnectionEvent) => void;

type PendingSubscription = {
  callback: SocketMessageHandler;
  destination: string;
  key: string;
};

type ActiveSubscription = PendingSubscription & {
  stompSubscription: StompSubscription;
};

type ParsedSocketMessage = unknown | typeof INVALID_SOCKET_MESSAGE;

class SocketManager {
  private client: Client | null = null;

  private isConnected = false;

  private isConnecting = false;

  /** Dev 전용 mock 모드. publish를 silent no-op으로 만들어 진짜 WS 없이 동작 가능. */
  private mockMode = false;

  private readonly connectCallbacks = new Set<() => void>();

  private readonly connectionListeners = new Set<ConnectionListener>();

  private readonly pendingSubscriptions = new Map<string, PendingSubscription>();

  private readonly subscriptions = new Map<string, ActiveSubscription>();

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
      this.emitConnectionEvent('connected');
    };

    client.onWebSocketClose = () => {
      this.isConnected = false;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      this.emitConnectionEvent('disconnected');
      console.warn('[socket] WebSocket connection closed.');
    };

    client.onStompError = (frame) => {
      this.isConnected = false;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      this.emitConnectionEvent('disconnected');
      console.error('[socket] STOMP error.', {
        body: frame.body,
        message: frame.headers.message,
      });
    };

    this.client = client;
    client.activate();
  }

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

  unsubscribe(key: string): void {
    this.pendingSubscriptions.delete(key);

    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      return;
    }

    subscription.stompSubscription.unsubscribe();
    this.subscriptions.delete(key);
  }

  publish(destination: string, body: Record<string, unknown>): void {
    if (this.mockMode) return;
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

  /**
   * Dev 전용: WS 서버 없이 mock 메시지를 구독 callback에 직접 주입한다.
   * pending/active subscriptions 모두 검사. WS 연동 완료 후 제거 가능.
   */
  simulateIncoming(destination: string, message: object): void {
    for (const sub of this.pendingSubscriptions.values()) {
      if (sub.destination === destination) sub.callback(message);
    }
    for (const sub of this.subscriptions.values()) {
      if (sub.destination === destination) sub.callback(message);
    }
  }

  /**
   * Dev 전용: publish를 silent no-op으로 만들어 mock 모드 동안 "not connected" 경고를 억제.
   * WS 연동 완료 후 제거 가능.
   */
  enterMockMode(): void {
    this.mockMode = true;
  }

  /**
   * Dev 전용: mock 모드 해제. enterMockMode 호출 컴포넌트의 cleanup에서 반드시 호출해야
   * 이후 실제 WS publish가 영구 차단되지 않는다.
   */
  leaveMockMode(): void {
    this.mockMode = false;
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

  private emitConnectionEvent(event: ConnectionEvent): void {
    this.connectionListeners.forEach((listener) => listener(event));
  }

  /**
   * 소켓 연결/단절 이벤트를 구독한다.
   * @returns 구독 해제 함수
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }
}

export const socketManager = new SocketManager();
