import Phaser from 'phaser';

/**
 * 'game:restart' 이벤트 payload.
 *
 * 다시하기 시 Scene이 새 세션 데이터로 scene.restart()를 수행해야 하므로
 * sessionData 전체를 전달합니다. 도메인 타입(Difficulty/Command 등)을 직접 import하면
 * core ← features 역방향 의존이 생기므로, 여기선 구조적 형태만 선언합니다(브릿지 계약).
 */
export interface GameRestartPayload {
  sessionId: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  commandSet: ReadonlyArray<{
    commandSequence: number;
    text: string;
    branchName: string;
    type: 'CREATE' | 'MERGE' | 'COMMON' | 'SWITCH';
    itemDrop?: 'restore' | 'stash' | 'cherry-pick';
  }>;
  isTutorial: boolean;
}

export interface EventMap {
  'game:start': void;
  'game:pause': void;
  'game:resume': void;
  'game:over': void;
  'game:session-expired': void;
  'game:restart': GameRestartPayload;
  'game:complete': void;
  'score:update': number;
  'combo:update': number;
  'lives:update': number;
  'timer:tick': number;
  'command:complete': { index: number };
  'command:miss': { index: number };
  'command:wrong': void;
  'item:click': { slot: 0 | 1 | 2 };
  'item:use': { slot: 0 | 1 | 2 };
  'item:acquired': { slot: 0 | 1 | 2 };
  'stash:end': void;
  'cherry-pick:end': void;
  'branch:switch': { branch: string };
  'lane:create': { branch: string };
  'tutorial:pause': void;
  'tutorial:show-command': void;
  'tutorial:freeze-command': void;
}

type EventKey = keyof EventMap;

/**
 * K에 이벤트 이름을 넣으면 그에 맞는 콜백 타입이 결정됩니다.
 * 예) K = 'score:update' → (payload: number) => void
 *     K = 'game:pause'   → () => void
 */
type Callback<K extends EventKey> = EventMap[K] extends void
  ? () => void
  : (payload: EventMap[K]) => void;

// Phaser의 EventEmitter를 상속하여 타입 안정성이 보장되는 이벤트 버스 구현
class TypedEventBus extends Phaser.Events.EventEmitter {
  /**
   * 이벤트를 발행합니다. 구독 중인 모든 리스너에게 전달됩니다.
   *
   * void 이벤트는 페이로드 없이, 나머지는 두 번째 인자로 값을 전달합니다.
   * 반환값은 리스너가 하나라도 있었으면 true, 없었으면 false입니다.
   *
   * @example
   * EventBus.emit('game:pause');          // void — 페이로드 없음
   * EventBus.emit('score:update', 3000);  // number 페이로드
   */
  emit<K extends EventKey>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * 이벤트를 구독합니다. 해당 이벤트가 emit될 때마다 fn이 호출됩니다.
   *
   * context는 fn 안에서 this가 무엇을 가리킬지를 결정합니다.
   * Phaser Scene에서 등록할 때 this를 넘기면, shutdown() 시
   * EventBus.off(event, fn, this)로 정확히 같은 리스너만 해제할 수 있습니다.
   *
   * @example
   * // React Hook
   * EventBus.on('score:update', (score) => setScore(score));
   *
   * // Phaser Scene — 클래스 필드 화살표 함수
   * EventBus.on('game:resume', this.handleResume);
   */
  on<K extends EventKey>(event: K, fn: Callback<K>, context?: unknown): this {
    return super.on(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 이벤트를 딱 한 번만 구독합니다. fn이 한 번 호출되면 자동으로 해제됩니다.
   *
   * 게임 시작 직후 초기화 이벤트처럼 "한 번만 받으면 되는" 상황에 사용합니다.
   *
   * @example
   * EventBus.once('game:complete', () => showResultModal());
   */
  once<K extends EventKey>(event: K, fn: Callback<K>, context?: unknown): this {
    return super.once(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 이벤트 구독을 해제합니다.
   *
   * on()으로 등록할 때 context를 넘겼다면, off()에도 같은 context를 넘겨야
   * 정확히 그 리스너만 해제됩니다. context 없이 fn만 넘기면 익명 함수는
   * 참조가 달라 해제되지 않으니 주의하세요.
   *
   * @example
   * // Phaser Scene shutdown()
   * EventBus.off('game:resume', this.handleResume, this);
   *
   * // React Hook cleanup
   * return () => { EventBus.off('score:update', handleScore); };
   */
  off<K extends EventKey>(event: K, fn?: Callback<K>, context?: unknown): this {
    return super.off(event, fn as ((...args: unknown[]) => void) | undefined, context);
  }
}

export const EventBus = new TypedEventBus();
