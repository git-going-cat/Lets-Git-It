import { atom } from 'jotai';

import type { ArrowKey } from '../game/conflictArrows';

/**
 * CONFLICT 미니게임 진행 상태. null이면 모달이 닫혀 있습니다.
 * 헤더 표시용 데이터(headBranch/incomingBranch/filePath)도 함께 담아 두어,
 * 오버레이가 도메인별 commandSet 형태에 의존하지 않도록 분리합니다.
 */
export interface ConflictMiniGameState {
  sequence: ArrowKey[];
  progress: number;
  scenarioIndex: number;
  /** onResolve/onTypo 콜백에 전달할 식별자. 호출자 도메인이 의미를 부여합니다. */
  commandIndex: number;
  /** diff 좌측 패널 헤더에 표시할 현재 브랜치명. */
  headBranch: string;
  /** diff 우측 패널 헤더에 표시할 들어오는 브랜치명. */
  incomingBranch: string;
  /** 모달 헤더에 표시할 파일 경로. */
  filePath: string;
}

export const conflictMiniGameAtom = atom<ConflictMiniGameState | null>(null);
