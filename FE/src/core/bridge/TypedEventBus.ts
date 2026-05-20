import Phaser from 'phaser';

/**
 * K에 이벤트 이름을 넣으면 그에 맞는 콜백 타입이 결정됩니다.
 * 예) K = 'score:update' → (payload: number) => void
 *     K = 'game:pause'   → () => void
 */
type Callback<TMap, K extends keyof TMap> = TMap[K] extends void
  ? () => void
  : (payload: TMap[K]) => void;

/**
 * 도메인별 이벤트 맵을 타입 인자로 받는 제네릭 이벤트 버스.
 * Phaser.Events.EventEmitter를 상속하므로 Phaser Scene 안에서도 그대로 사용할 수 있습니다.
 *
 * @example
 * // 이벤트 맵 정의
 * interface MyEventMap { 'score:update': number; 'game:over': void; }
 *
 * // 버스 인스턴스 생성
 * export const myBus = new TypedEventBus<MyEventMap>();
 *
 * // 발행 — 잘못된 payload는 컴파일 에러
 * myBus.emit('score:update', 100);
 * myBus.emit('game:over');
 */
export class TypedEventBus<TMap extends object> extends Phaser.Events.EventEmitter {
  /**
   * 이벤트를 발행합니다. 구독 중인 모든 리스너에게 전달됩니다.
   *
   * void 이벤트는 페이로드 없이, 나머지는 두 번째 인자로 값을 전달합니다.
   * 반환값은 리스너가 하나라도 있었으면 true, 없었으면 false입니다.
   */
  emit<K extends keyof TMap & string>(
    event: K,
    ...args: TMap[K] extends void ? [] : [TMap[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * 이벤트를 구독합니다. 해당 이벤트가 emit될 때마다 fn이 호출됩니다.
   *
   * context는 fn 안에서 this가 무엇을 가리킬지를 결정합니다.
   * Phaser Scene에서 등록할 때 this를 넘기면 shutdown() 시
   * off(event, fn, this)로 정확히 같은 리스너만 해제할 수 있습니다.
   */
  on<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>, context?: unknown): this {
    return super.on(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 이벤트를 딱 한 번만 구독합니다. fn이 한 번 호출되면 자동으로 해제됩니다.
   */
  once<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>, context?: unknown): this {
    return super.once(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 이벤트 구독을 해제합니다.
   *
   * on()으로 등록할 때 context를 넘겼다면 off()에도 같은 context를 전달해야
   * 정확히 그 리스너만 해제됩니다. context 없이 fn만 넘기면 익명 함수는
   * 참조가 달라 해제되지 않으니 주의하세요.
   */
  off<K extends keyof TMap & string>(event: K, fn?: Callback<TMap, K>, context?: unknown): this {
    return super.off(event, fn as ((...args: unknown[]) => void) | undefined, context);
  }

  /**
   * 이벤트를 구독하고, 호출하면 구독을 해제하는 함수를 반환합니다.
   * useEffect cleanup 함수로 그대로 반환하면 off 누락 없이 cleanup을 보장합니다.
   *
   * @example
   * useEffect(() => singleBus.subscribe('game:start', handleStart), []);
   *
   * // 여러 이벤트를 한 번에 구독할 때는 반환값을 배열로 모아 일괄 해제합니다.
   * useEffect(() => {
   *   const unsubs = [
   *     singleBus.subscribe('game:start', handleStart),
   *     singleBus.subscribe('game:over', handleOver),
   *   ];
   *   return () => unsubs.forEach((fn) => fn());
   * }, []);
   */
  subscribe<K extends keyof TMap & string>(event: K, fn: Callback<TMap, K>): () => void {
    this.on(event, fn);
    return () => this.off(event, fn);
  }
}
