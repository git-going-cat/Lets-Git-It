import { Client } from '@stomp/stompjs';

import { env } from '@/config/env';
import { reissueToken } from '@/core/http';

import type { SocketMessageHandler } from '@/shared/types/socket.types';
import type { IMessage, StompSubscription } from '@stomp/stompjs';

const RECONNECT_DELAY_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 5000;
const INVALID_SOCKET_MESSAGE = Symbol('INVALID_SOCKET_MESSAGE');
export const TERMINAL_AUTH_ERROR_CODES = new Set([
  'TOKEN_BLACKLISTED',
  'LOGGED_OUT',
  'REPLACED_BY_NEW_LOGIN',
]);

type ConnectionEvent = 'connected' | 'disconnected';
type ConnectionListener = (event: ConnectionEvent) => void;
type DisconnectError = {
  code: string;
  message: string;
};

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

  private isReissuingToken = false;

  private lastDisconnectError: DisconnectError | null = null;

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
      heartbeatIncoming: HEARTBEAT_INTERVAL_MS,
      heartbeatOutgoing: HEARTBEAT_INTERVAL_MS,
      reconnectDelay: RECONNECT_DELAY_MS,
    });

    client.onConnect = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.lastDisconnectError = null;
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
      if (this.isTokenExpiredFrame(frame.body, frame.headers.message)) {
        void this.reconnectWithFreshToken();
        return;
      }

      const disconnectError = this.parseErrorFrame(frame.body, frame.headers.message);
      this.lastDisconnectError = disconnectError;
      this.isConnected = false;
      this.isConnecting = false;
      this.queueActiveSubscriptionsForReconnect();
      this.emitConnectionEvent('disconnected');
      console.error('[socket] STOMP error.', {
        body: frame.body,
        message: frame.headers.message,
      });

      if (TERMINAL_AUTH_ERROR_CODES.has(disconnectError.code)) {
        this.pendingSubscriptions.clear();
        this.subscriptions.clear();
        this.client = null;
        void client.deactivate();
      }
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

  getLastDisconnectError(): DisconnectError | null {
    return this.lastDisconnectError;
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

  private isTokenExpiredFrame(body: string, message?: string): boolean {
    if (message === '액세스 토큰이 만료되었습니다.') return true;

    try {
      const parsed = JSON.parse(body) as { code?: unknown };
      return parsed.code === 'TOKEN_EXPIRED';
    } catch {
      return false;
    }
  }

  private parseErrorFrame(body: string, message?: string): DisconnectError {
    try {
      const parsed = JSON.parse(body) as { code?: unknown; message?: unknown };
      if (typeof parsed.code === 'string') {
        return {
          code: parsed.code,
          message: typeof parsed.message === 'string' ? parsed.message : (message ?? parsed.code),
        };
      }
    } catch {
      // fall through to message-only error
    }

    return {
      code: 'STOMP_ERROR',
      message: message ?? 'WebSocket connection failed.',
    };
  }

  private async reconnectWithFreshToken(): Promise<void> {
    if (this.isReissuingToken) return;

    this.isReissuingToken = true;
    this.isConnected = false;
    this.isConnecting = false;
    this.queueActiveSubscriptionsForReconnect();
    this.emitConnectionEvent('disconnected');

    const currentClient = this.client;
    this.client = null;

    try {
      if (currentClient) {
        await currentClient.deactivate();
      }
      const token = await reissueToken();
      this.connect(token);
    } catch (error) {
      console.error('[socket] Token reissue failed during STOMP reconnect.', error);
    } finally {
      this.isReissuingToken = false;
    }
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
