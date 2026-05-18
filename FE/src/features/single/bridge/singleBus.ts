import { TypedEventBus } from '@/core/bridge/TypedEventBus';

import type { ArrowKey } from '@/shared/game/conflictArrows';

/**
 * 'game:restart' 이벤트 payload.
 *
 * 다시하기 시 Scene이 새 세션 데이터로 scene.restart()를 수행해야 하므로
 * sessionData 전체를 전달합니다. 도메인 타입(Difficulty/Command 등)을 직접 import하면
 * features ← core 역방향 의존이 생기므로, 여기선 구조적 형태만 선언합니다(브릿지 계약).
 */
export interface GameRestartPayload {
  sessionId: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  commandSet: ReadonlyArray<{
    commandSequence: number;
    text: string;
    branchName: string;
    type: 'CREATE' | 'MERGE' | 'COMMON' | 'SWITCH' | 'CONFLICT';
    itemDrop?: 'restore' | 'stash' | 'cherry-pick';
  }>;
  isTutorial: boolean;
}

/**
 * 싱글 플레이 도메인에서 사용하는 이벤트 계약.
 * singleBus를 통해서만 emit/on 할 수 있으며, 이 맵에 없는 이벤트는 컴파일 에러가 됩니다.
 */
export interface SingleEventMap {
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
  'conflict:start': {
    index: number;
    sequence: ArrowKey[];
    headBranch: string;
    incomingBranch: string;
    filePath: string;
  };
  'conflict:typo': { index: number };
  'conflict:resolve': { index: number };
}

/** 싱글 플레이 전용 이벤트 버스. features/single 도메인 안에서만 사용합니다. */
export const singleBus = new TypedEventBus<SingleEventMap>();
