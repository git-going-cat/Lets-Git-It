import Phaser from 'phaser';

import { EventBus } from '@/core/bridge/EventBus';

import { BranchLane } from './BranchLane';

import type { Command, Difficulty, SingleSceneData } from '../types/single.types';

/**
 * 난이도별 명령어 낙하 시간 (ms).
 * EASY 명령어 수가 적고 느리게 떨어지며, HARD는 많고 빠르게 떨어진다.
 * 두 변수(낙하 속도 × 명령어 수)의 곱이 전체 게임 시간을 결정한다.
 */
const FALL_DURATION_MS: Record<Difficulty, number> = {
  EASY: 18_000,
  NORMAL: 8_000,
  HARD: 4_000,
};

const TIMER_INTERVAL_MS = 100;

export class SingleScene extends Phaser.Scene {
  private commandSet: Command[] = [];
  private commandIndex = 0;
  private fallDuration = FALL_DURATION_MS.NORMAL;
  private lanes = new Map<string, BranchLane>();
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private elapsedMs = 0;
  private sceneData: SingleSceneData | null = null;
  private isGameEnded = false;

  constructor() {
    super({ key: 'SingleScene' });
  }

  create(data?: object): void {
    const { difficulty, commandSet } = data as SingleSceneData;
    this.sceneData = data as SingleSceneData;

    this.commandSet = commandSet;
    this.commandIndex = 0;
    this.elapsedMs = 0;
    this.isGameEnded = false;
    this.fallDuration = FALL_DURATION_MS[difficulty];

    this.initLanes(commandSet);
    this.registerEvents();
    this.startTimer();
    this.showCurrentCommand();

    // game.destroy() 시 Phaser가 shutdown()을 보장하지 않는 버전이 있으므로
    // game destroy 이벤트에서도 EventBus 핸들러를 정리한다
    this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
  }

  shutdown(): void {
    this.timerEvent?.remove();
    this.lanes.clear();

    EventBus.off('command:complete', this.handleCommandComplete);
    EventBus.off('game:pause', this.handleGamePause);
    EventBus.off('game:resume', this.handleGameResume);
    EventBus.off('game:restart', this.handleGameRestart);
    EventBus.off('game:over', this.handleGameEnd);
    EventBus.off('game:complete', this.handleGameEnd);
  }

  private initLanes(commandSet: Command[]): void {
    const branches = Array.from(new Set(commandSet.map((c) => c.branchName)));
    this.lanes.clear();
    branches.forEach((branch, i) => {
      this.lanes.set(branch, new BranchLane(this, i, branches.length, branch));
    });
  }

  private registerEvents(): void {
    EventBus.on('command:complete', this.handleCommandComplete);
    EventBus.on('game:pause', this.handleGamePause);
    EventBus.on('game:resume', this.handleGameResume);
    EventBus.on('game:restart', this.handleGameRestart);
    EventBus.on('game:over', this.handleGameEnd);
    EventBus.on('game:complete', this.handleGameEnd);
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: TIMER_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.elapsedMs += TIMER_INTERVAL_MS;
        EventBus.emit('timer:tick', this.elapsedMs);
      },
    });
  }

  private showCurrentCommand(): void {
    if (this.commandIndex >= this.commandSet.length) {
      EventBus.emit('game:complete');
      return;
    }
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.showCommand(cmd, this.fallDuration, () => {
      this.onCommandTimeout();
    });
  }

  // BranchLane tween 완료 시 콜백.
  // miss → React lives 감소 → game:over 여부 확정 → 이상 없으면 다음 커맨드 진행.
  private onCommandTimeout(): void {
    if (this.isGameEnded) return;
    const missedIndex = this.commandIndex;
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.clearCommand();
    this.commandIndex++;
    EventBus.emit('command:miss', { index: missedIndex }); // lives 감소 먼저
    if (!this.isGameEnded) {
      this.showCurrentCommand(); // lives 남아있으면 진행 (마지막이면 game:complete)
    }
  }

  private readonly handleCommandComplete = ({ index }: { index: number }): void => {
    if (index !== this.commandIndex) return;
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.clearCommand();
    this.commandIndex++;
    this.showCurrentCommand();
  };

  private readonly handleGamePause = (): void => {
    this.tweens.pauseAll();
    this.time.paused = true;
  };

  private readonly handleGameResume = (): void => {
    this.tweens.resumeAll();
    this.time.paused = false;
  };

  private readonly handleGameRestart = (): void => {
    if (this.sceneData) {
      this.scene.restart(this.sceneData);
    }
  };

  private readonly handleGameEnd = (): void => {
    this.isGameEnded = true;
    this.timerEvent?.remove();
    this.timerEvent = null;
    this.lanes.forEach((lane) => lane.clearCommand());
  };
}
