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

/** 서버 만료 타이머를 알 수 없으므로 시각적 낙하에 사용하는 기본값 (ms). */
const DEFAULT_FALL_DURATION_MS = 20_000;

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
  /** 마지막으로 시각적으로 spawn된 sequence. -1이면 아직 안 시작. */
  private lastSpawnedSeq = -1;
  /** look-ahead 다음 spawn 비율 (numPlayers에 따라 계산). 0.5 = 50% 위치에서 다음 등장. */
  private spawnRatio = 0.5;
  private lookAheadTimer: Phaser.Time.TimerEvent | null = null;
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
    this.lastSpawnedSeq = -1;
    this.isGameEnded = false;
    this.spawnRatio = calculateLookAheadRatio(data.players.length);

    this.initLanes(data.branches);
    this.initPlayerBranches(data.players);
    this.lanes.forEach((lane, branch) => lane.setLaneActive(branch === this.getMyBranch()));
    this.spawnNext();
    this.registerEvents();

    // SHUTDOWN/DESTROY는 씬 재시작(restart)마다 중복 등록되지 않도록 한 번만 바인딩.
    if (!this.lifecycleHandlersRegistered) {
      this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
      this.lifecycleHandlersRegistered = true;
    }
  }

  shutdown(): void {
    this.lookAheadTimer?.remove();
    this.lookAheadTimer = null;
    this.lanes.clear();
    this.busUnsubs.forEach((fn) => fn());
    this.busUnsubs = [];
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
    this.lanes.get(cmd.branchName)?.showCommand(cmd.text, DEFAULT_FALL_DURATION_MS, () => {
      // 시각적 낙하 완료 — 만료 판정은 서버 COMMAND_EXPIRED로 수신
    });
    this.lastSpawnedSeq = nextSeq;
    this.scheduleLookAhead();
  }

  private scheduleLookAhead(): void {
    this.lookAheadTimer?.remove();
    // 큐의 마지막 명령어가 끝났으면 더 이상 spawn할 게 없음
    if (this.lastSpawnedSeq + 1 >= this.commandMap.size) return;
    this.lookAheadTimer = this.time.delayedCall(DEFAULT_FALL_DURATION_MS * this.spawnRatio, () => {
      this.lookAheadTimer = null;
      this.spawnNext();
    });
  }

  private getMyBranch(): string {
    return this.playerBranches.get(this.myPlayerId) ?? '';
  }

  private registerEvents(): void {
    this.busUnsubs = [
      contributionBus.subscribe('score:update', this.handleScoreUpdate),
      contributionBus.subscribe('command:expired', this.handleCommandExpired),
      contributionBus.subscribe('position:update', this.handlePositionUpdate),
      contributionBus.subscribe('branch:switch', this.handleBranchSwitch),
      contributionBus.subscribe('game:end', this.handleGameEnd),
    ];
  }

  private readonly handleScoreUpdate = ({
    commandSequence,
  }: {
    commandSequence: number;
    scores: RankingEntry[];
    progress: { current: number; total: number; percent: number };
  }): void => {
    // commandSequence는 다음 seq. 방금 완료된 건 seq-1.
    const clearedSeq = commandSequence - 1;
    const clearedCmd = this.commandMap.get(clearedSeq);
    if (clearedCmd) this.lanes.get(clearedCmd.branchName)?.flashSuccess();
    // 다음 명령어가 아직 spawn 안 됐으면 (lookahead 전에 사용자가 완료한 경우) 즉시 spawn
    if (clearedSeq === this.lastSpawnedSeq) this.spawnNext();
  };

  private readonly handleCommandExpired = ({
    commandSequence,
  }: {
    commandSequence: number;
    scores: RankingEntry[];
  }): void => {
    const expiredSeq = commandSequence - 1;
    const expiredCmd = this.commandMap.get(expiredSeq);
    if (expiredCmd) this.lanes.get(expiredCmd.branchName)?.flashMiss();
    if (expiredSeq === this.lastSpawnedSeq) this.spawnNext();
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
    this.lookAheadTimer?.remove();
    this.lookAheadTimer = null;
    this.lanes.forEach((lane) => lane.clearAll());
  };
}
