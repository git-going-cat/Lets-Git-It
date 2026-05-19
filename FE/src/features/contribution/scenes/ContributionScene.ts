import Phaser from 'phaser';

import { contributionBus } from '../bridge/contributionBus';
import { useContributionStore } from '../store/contributionStore';
import { calculateLookAheadRatio } from '../utils/spawnRatio';

import { ContributionLane } from './ContributionLane';

import type {
  ContributionCommand,
  ContributionPlayer,
  RankingEntry,
} from '../types/contribution.types';

export interface ContributionSceneData {
  commandSet: ContributionCommand[];
  branches: string[];
  players: ContributionPlayer[];
  myPlayerId: string;
}

/**
 * 기여도 뺏기 Phaser 씬.
 *
 * - 모든 브랜치 레인을 처음부터 표시 (싱글과 달리 순차 공개 없음)
 * - 서버가 만료 타이머를 담당하므로 클라이언트는 시각적 낙하만 처리
 * - contributionBus 이벤트로 React ↔ Phaser 통신
 */
export class ContributionScene extends Phaser.Scene {
  private lanes = new Map<string, ContributionLane>();
  /** commandSequence → command. O(1) 조회용. */
  private commandMap = new Map<number, ContributionCommand>();
  /** 마지막으로 시각적으로 spawn된 sequence. 0이면 아직 안 시작 (서버 commandSequence는 1-based). */
  private lastSpawnedSeq = 0;
  /** look-ahead 다음 spawn 비율 (numPlayers에 따라 계산). 0.5 = 50% 위치에서 다음 등장. */
  private spawnRatio = 0.5;
  /**
   * look-ahead 타이머. Phaser `time.delayedCall`이 아닌 브라우저 setTimeout을 사용 —
   * Phaser 타이머는 RAF에 매여 있어 hidden 탭에서 ~1Hz로 throttling되어 명령어 spawn이 사실상 멈춤.
   * setTimeout은 hidden에서도 wall-clock 기반으로 fire되므로 백그라운드 동작이 정확.
   */
  private lookAheadTimer: ReturnType<typeof setTimeout> | null = null;
  private isGameEnded = false;
  private myPlayerId = '';
  /** playerId → currentBranch. POSITION_UPDATE 레인 글로우 이동에 사용. */
  private playerBranches = new Map<string, string>();
  private lifecycleHandlersRegistered = false;
  /** registerEvents에서 모은 contributionBus unsub들. shutdown에서 한 번에 호출. */
  private busUnsubs: Array<() => void> = [];

  constructor() {
    super({ key: 'ContributionScene' });
  }

  create(): void {
    const store = useContributionStore.getState();
    const data: ContributionSceneData = {
      commandSet: store.commandSet,
      branches: store.branches,
      players: store.players,
      myPlayerId: store.myPlayerId ?? '',
    };

    this.myPlayerId = data.myPlayerId;
    this.commandMap.clear();
    data.commandSet.forEach((cmd) => this.commandMap.set(cmd.commandSequence, cmd));
    this.lastSpawnedSeq = 0;
    this.isGameEnded = false;
    this.spawnRatio = calculateLookAheadRatio(data.players.length);

    this.initLanes(data.branches);
    this.initPlayerBranches(data.players);
    this.lanes.forEach((lane, branch) => lane.setLaneActive(branch === this.getMyBranch()));
    this.registerEvents();
    // game:start가 Phaser create() 전에 발화됐을 경우를 대비한 폴백
    if (
      store.clientStartAt != null &&
      Date.now() >= store.clientStartAt &&
      this.lastSpawnedSeq === 0
    ) {
      this.spawnNext();
    }

    // SHUTDOWN/DESTROY는 씬 재시작(restart)마다 중복 등록되지 않도록 한 번만 바인딩.
    if (!this.lifecycleHandlersRegistered) {
      this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
      this.lifecycleHandlersRegistered = true;
    }
  }

  shutdown(): void {
    if (this.lookAheadTimer !== null) {
      clearTimeout(this.lookAheadTimer);
      this.lookAheadTimer = null;
    }
    this.lanes.clear();
    this.busUnsubs.forEach((fn) => fn());
    this.busUnsubs = [];
  }

  /**
   * Phaser 매 프레임 콜백. 각 레인의 명령어 노드 y 위치를 wall-clock 기반으로 갱신.
   * Hidden 탭에서 RAF가 throttling되어도 visible 복귀 시점에 정확한 위치로 그려지도록
   * tween이 아닌 manual update 방식을 사용한다.
   */
  update(): void {
    this.lanes.forEach((lane) => lane.updateNodes());
  }

  private initLanes(branches: string[]): void {
    this.lanes.clear();
    branches.forEach((branch, i) => {
      const lane = new ContributionLane(this, i, branches.length, branch);
      this.lanes.set(branch, lane);
    });
  }

  private initPlayerBranches(players: ContributionPlayer[]): void {
    this.playerBranches.clear();
    players.forEach((p) => {
      this.playerBranches.set(p.playerId, p.currentBranch);
    });
  }

  /** 다음 명령어를 spawn하고, 또 다음을 위한 look-ahead 타이머를 건다. */
  private spawnNext(): void {
    if (this.isGameEnded) return;
    const nextSeq = this.lastSpawnedSeq + 1;
    const cmd = this.commandMap.get(nextSeq);
    if (!cmd) return;
    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    this.lanes.get(cmd.branchName)?.showCommand(cmd.text, cmd.fallDurationMs, () => {
      contributionBus.emit('command:expire', { commandSequence: cmd.commandSequence, requestId });
    });
    this.lastSpawnedSeq = nextSeq;
    this.scheduleLookAhead(cmd.fallDurationMs);
  }

  private scheduleLookAhead(fallDurationMs: number): void {
    if (this.lookAheadTimer !== null) {
      clearTimeout(this.lookAheadTimer);
      this.lookAheadTimer = null;
    }
    // 큐의 마지막 명령어가 끝났으면 더 이상 spawn할 게 없음
    if (this.lastSpawnedSeq + 1 > this.commandMap.size) return;
    this.lookAheadTimer = setTimeout(() => {
      this.lookAheadTimer = null;
      this.spawnNext();
    }, fallDurationMs * this.spawnRatio);
  }

  private getMyBranch(): string {
    return this.playerBranches.get(this.myPlayerId) ?? '';
  }

  private registerEvents(): void {
    this.busUnsubs = [
      contributionBus.subscribe('game:start', this.handleGameStart),
      contributionBus.subscribe('score:update', this.handleScoreUpdate),
      contributionBus.subscribe('command:expired', this.handleCommandExpired),
      contributionBus.subscribe('position:update', this.handlePositionUpdate),
      contributionBus.subscribe('branch:switch', this.handleBranchSwitch),
      contributionBus.subscribe('game:end', this.handleGameEnd),
    ];
  }

  private readonly handleGameStart = (): void => {
    if (this.lastSpawnedSeq === 0) this.spawnNext();
  };

  private readonly handleScoreUpdate = ({
    commandSequence,
  }: {
    commandSequence: number;
    scores: RankingEntry[];
    progress: { current: number; total: number; percent: number };
  }): void => {
    const clearedCmd = this.commandMap.get(commandSequence);
    if (clearedCmd) this.lanes.get(clearedCmd.branchName)?.flashSuccess();
    // 다음 명령어가 아직 spawn 안 됐으면 (lookahead 전에 사용자가 완료한 경우) 즉시 spawn
    if (commandSequence === this.lastSpawnedSeq) this.spawnNext();
  };

  private readonly handleCommandExpired = ({
    commandSequence,
  }: {
    commandSequence: number;
    scores: RankingEntry[];
  }): void => {
    const expiredCmd = this.commandMap.get(commandSequence);
    if (expiredCmd) this.lanes.get(expiredCmd.branchName)?.flashMiss();
    if (commandSequence === this.lastSpawnedSeq) this.spawnNext();
  };

  private readonly handlePositionUpdate = ({
    playerId,
    branch,
  }: {
    playerId: string;
    branch: string;
  }): void => {
    this.playerBranches.set(playerId, branch);
  };

  private readonly handleBranchSwitch = ({ branch }: { branch: string }): void => {
    this.playerBranches.set(this.myPlayerId, branch);
    this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === branch));
  };

  private readonly handleGameEnd = (): void => {
    this.isGameEnded = true;
    if (this.lookAheadTimer !== null) {
      clearTimeout(this.lookAheadTimer);
      this.lookAheadTimer = null;
    }
    this.lanes.forEach((lane) => lane.clearAll());
  };
}
