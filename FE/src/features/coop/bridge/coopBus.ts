import { TypedEventBus } from '@/core/bridge/TypedEventBus';

interface CoopEventMap {
  'coop:reveal-ended': void;
  'coop:assign-start': void;
  'coop:assign-reveal': { myCommandOrder: number };
  'coop:assign-complete': void;
  'coop:screen-shake': void;
  'coop:input-wrong-shake': void;
}

/**
 * 협력 모드 React overlay와 Phaser CoopScene 사이를 연결하는 도메인 이벤트 버스입니다.
 */
export const coopBus = new TypedEventBus<CoopEventMap>();
