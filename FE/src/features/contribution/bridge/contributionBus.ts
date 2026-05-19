import { TypedEventBus } from '@/core/bridge/TypedEventBus';

import type { ContributionProgress, RankingEntry } from '../types/contribution.types';

/**
 * 기여도 뺏기 도메인 이벤트 계약.
 *
 * WS 수신 → 소켓 핸들러가 parse 후 emit.
 * UI 입력 → useContributionInput이 emit.
 * Phaser Scene → contributionBus 경유 렌더 갱신 (React import 금지).
 */
export interface ContributionEventMap {
  /** 게임 시작. WS 핸들러 또는 WaitingRoom 시작 신호 수신 시 emit. */
  'game:start': void;
  /** 게임 종료 (정상/조기 퇴장 공통). */
  'game:end': void;

  /** 플레이어가 입력한 명령어를 WS로 전송 요청. 검증은 BE에서 수행. */
  'command:submit': { text: string; requestId: string };
  /** CONTRIBUTION_INPUT_FAILED 수신 — 오타·순서 불일치 등 BE 판정 실패. */
  'command:failed': { errorCode: string; requestId: string };

  /** SCORE_UPDATE 수신 — 랭킹·진행도 갱신. */
  'score:update': {
    scores: RankingEntry[];
    progress: ContributionProgress;
    commandSequence: number;
    winnerId: string;
    requestId: string;
  };
  /** COMMAND_EXPIRED 수신 — 아무도 입력 못 해 시간 초과. */
  'command:expired': { commandSequence: number; scores: RankingEntry[] };

  /** POSITION_UPDATE 수신 — 다른 플레이어 브랜치 이동. */
  'position:update': { playerId: string; branch: string };
  /** 내 브랜치 이동 (git switch 입력 또는 POSITION_UPDATE에서 myPlayerId 일치 시). */
  'branch:switch': { branch: string; requestId: string };

  /** Phaser 씬에서 명령어 노드가 바닥에 도달했을 때 emit. useContributionGame이 구독해 COMMAND_EXPIRE_REQUEST 전송. */
  'command:expire': { commandSequence: number; requestId: string };
}

/** 기여도 뺏기 전용 이벤트 버스. features/contribution 도메인 안에서만 사용한다. */
export const contributionBus = new TypedEventBus<ContributionEventMap>();
