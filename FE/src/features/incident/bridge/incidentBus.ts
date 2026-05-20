import { TypedEventBus } from '@/core/bridge/TypedEventBus';

import type { ScoreResult } from '../types/incident.types';

/**
 * 사고처리반 도메인 이벤트 계약.
 * incidentBus를 통해서만 emit/subscribe할 수 있으며, 이 맵에 없는 이벤트는 컴파일 에러가 됩니다.
 *
 * Phaser 없이 순수 React 환경이지만, 훅 간 결합도를 낮추기 위해 버스를 도입합니다.
 * useIncidentScore가 채점 결과를 emit → useIncidentVisualization이 구독해 fly 트랜지션을 실행하는
 * 단방향 흐름을 보장합니다.
 */
export interface IncidentEventMap {
  /** 입력 재수정·재시도 시 viz 초기화 신호 */
  'phase:idle': void;
  /** 채점 완료. status가 perfect/accepted일 때만 emit — viz fly 트랜지션 트리거 용도 */
  'card:graded': { result: ScoreResult; input: string };
  /** 다음 카드로 이동 완료 */
  'card:next': { cardIndex: number };
  /** 시나리오 전체 완료 */
  'scenario:complete': void;
}

/** 사고처리반 전용 이벤트 버스. features/incident 도메인 안에서만 사용합니다. */
export const incidentBus = new TypedEventBus<IncidentEventMap>();
