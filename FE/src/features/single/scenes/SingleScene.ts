import Phaser from 'phaser';

import { EventBus } from '@/core/bridge/EventBus';

import { CHERRY_PICK_ANIM_MS } from '../constants/itemAnimations';
import { TUTORIAL_FALL_DURATION_MS } from '../constants/tutorialData';
import { parseSwitchTarget } from '../utils/branchParser';

import { BranchLane } from './BranchLane';

import type { Command, Difficulty, SingleSceneData } from '../types/single.types';
import type { GameRestartPayload } from '@/core/bridge/EventBus';

/**
 * 난이도별 명령어 낙하 시간 (ms).
 * EASY 명령어 수가 적고 느리게 떨어지며, HARD는 많고 빠르게 떨어진다.
 * 두 변수(낙하 속도 × 명령어 수)의 곱이 전체 게임 시간을 결정한다.
 */
const FALL_DURATION_MS: Record<Difficulty, number> = {
  EASY: 25_000,
  NORMAL: 15_000,
  HARD: 7_000,
};

const TIMER_INTERVAL_MS = 100;

/**
 * 싱글 플레이 메인 씬.
 * 레인 렌더링, 명령어 낙하 타이머, EventBus 기반 React ↔ Phaser 통신을 담당합니다.
 * 게임 이벤트(complete/miss/pause/resume/restart/item:use)를 처리하며
 * 게임 종료 시 모든 Phaser 타이머·트윈을 정리합니다.
 */
export class SingleScene extends Phaser.Scene {
  private commandSet: Command[] = [];
  private commandIndex = 0;
  private fallDuration = FALL_DURATION_MS.NORMAL;
  private lanes = new Map<string, BranchLane>();
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private elapsedMs = 0;
  private isGameEnded = false;
  private isUserPaused = false;
  private stashTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private cherryPickTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isTutorialMode = false;
  // scene.restart() 시 인스턴스가 보존되므로, DESTROY 핸들러를 1회만 등록하기 위한 가드.
  private destroyHandlerRegistered = false;

  constructor() {
    super({ key: 'SingleScene' });
  }

  create(data?: object): void {
    const raw = data as SingleSceneData & { autoStart?: boolean };
    const { difficulty, commandSet, autoStart } = raw;

    this.commandSet = commandSet;
    this.commandIndex = 0;
    this.elapsedMs = 0;
    this.isGameEnded = false;
    this.isTutorialMode = raw.isTutorial ?? false;
    this.fallDuration = FALL_DURATION_MS[difficulty];

    this.initLanes(commandSet);
    this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === 'main'));
    this.registerEvents();

    // autoStart: 재시작(restart) 경로에서만 true. 최초 진입은 StartModal의 game:start를 기다린다.
    if (autoStart) {
      this.startTimer();
      this.showCurrentCommand();
    }

    // game.destroy() 시 Phaser가 shutdown()을 보장하지 않는 버전이 있으므로
    // game destroy 이벤트에서도 EventBus 핸들러를 정리한다.
    // scene.restart()는 인스턴스를 보존하므로 once 리스너가 누적되지 않도록 가드.
    if (!this.destroyHandlerRegistered) {
      this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
      this.destroyHandlerRegistered = true;
    }
  }

  shutdown(): void {
    this.timerEvent?.remove();
    this.lanes.clear();
    if (this.stashTimeoutId !== null) {
      clearTimeout(this.stashTimeoutId);
      this.stashTimeoutId = null;
    }
    if (this.cherryPickTimeoutId !== null) {
      clearTimeout(this.cherryPickTimeoutId);
      this.cherryPickTimeoutId = null;
    }

    EventBus.off('game:start', this.handleGameStart);
    EventBus.off('command:complete', this.handleCommandComplete);
    EventBus.off('branch:switch', this.handleBranchSwitch);
    EventBus.off('lane:create', this.handleLaneCreate);
    EventBus.off('game:pause', this.handleGamePause);
    EventBus.off('game:resume', this.handleGameResume);
    EventBus.off('game:restart', this.handleGameRestart);
    EventBus.off('game:over', this.handleGameEnd);
    EventBus.off('game:session-expired', this.handleGameEnd);
    EventBus.off('game:complete', this.handleGameEnd);
    EventBus.off('item:use', this.handleItemUse);
    EventBus.off('tutorial:show_command', this.handleTutorialShowCommand);
    EventBus.off('tutorial:freeze_command', this.handleTutorialFreezeCommand);
  }

  private initLanes(commandSet: Command[]): void {
    const branches = Array.from(new Set(commandSet.map((c) => c.branchName)));
    this.lanes.clear();
    branches.forEach((branch, i) => {
      const lane = new BranchLane(this, i, branches.length, branch);
      if (branch !== 'main') lane.setAlpha(0);
      this.lanes.set(branch, lane);
    });
  }

  private registerEvents(): void {
    EventBus.on('game:start', this.handleGameStart);
    EventBus.on('command:complete', this.handleCommandComplete);
    EventBus.on('branch:switch', this.handleBranchSwitch);
    EventBus.on('lane:create', this.handleLaneCreate);
    EventBus.on('game:pause', this.handleGamePause);
    EventBus.on('game:resume', this.handleGameResume);
    EventBus.on('game:restart', this.handleGameRestart);
    EventBus.on('game:over', this.handleGameEnd);
    EventBus.on('game:session-expired', this.handleGameEnd);
    EventBus.on('game:complete', this.handleGameEnd);
    EventBus.on('item:use', this.handleItemUse);
    EventBus.on('tutorial:show_command', this.handleTutorialShowCommand);
    EventBus.on('tutorial:freeze_command', this.handleTutorialFreezeCommand);
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
    // 튜토리얼은 freezeWithBlink로 tween을 멈춰 timeout 자체가 안 일어나야 정상이지만,
    // 안전망으로 timeout 진입 시 commandIndex 진행을 차단해 useTutorialMode 상태 머신을 보호한다.
    if (this.isTutorialMode) return;
    const missedIndex = this.commandIndex;
    const cmd = this.commandSet[this.commandIndex];
    const lane = this.lanes.get(cmd.branchName);
    lane?.clearCommand();
    lane?.flashMiss();
    this.commandIndex++;
    EventBus.emit('command:miss', { index: missedIndex }); // lives 감소 먼저
    // miss여도 브랜치 구조 변경은 반드시 적용해야 이후 커맨드 진행이 가능
    this.applyBranchEffect(cmd);
    if (!this.isGameEnded) {
      this.showCurrentCommand(); // lives 남아있으면 진행 (마지막이면 game:complete)
    }
  }

  // CREATE·SWITCH: 레인 공개 및 브랜치 전환 / MERGE: 병합된 레인 숨김
  private applyBranchEffect(cmd: Command): void {
    if (cmd.type === 'CREATE' || cmd.type === 'SWITCH') {
      const target = parseSwitchTarget(cmd.text);
      if (target) {
        EventBus.emit('branch:switch', { branch: target });
        if (cmd.type === 'CREATE') EventBus.emit('lane:create', { branch: target });
      }
    } else if (cmd.type === 'MERGE') {
      const mergedBranch = parseSwitchTarget(cmd.text);
      if (mergedBranch) this.lanes.get(mergedBranch)?.hideLane();
    }
  }

  private readonly handleBranchSwitch = ({ branch }: { branch: string }): void => {
    this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === branch));
  };

  private readonly handleLaneCreate = ({ branch }: { branch: string }): void => {
    this.lanes.get(branch)?.revealLane();
  };

  private readonly handleCommandComplete = ({ index }: { index: number }): void => {
    if (index !== this.commandIndex) return;
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.flashSuccess();
    this.applyBranchEffect(cmd);
    this.commandIndex++;

    // 커맨드 성공 시 stash 조기 종료
    if (this.stashTimeoutId !== null) {
      clearTimeout(this.stashTimeoutId);
      this.stashTimeoutId = null;
      if (!this.isUserPaused) {
        this.tweens.resumeAll();
        this.time.paused = false;
      }
    }

    // 튜토리얼 모드: useTutorialMode가 tutorial:show_command를 emit할 때까지 대기
    if (!this.isTutorialMode) {
      this.showCurrentCommand();
    }
  };

  private readonly handleGamePause = (): void => {
    this.isUserPaused = true;
    this.tweens.pauseAll();
    this.time.paused = true;
  };

  private readonly handleGameResume = (): void => {
    this.isUserPaused = false;
    this.tweens.resumeAll();
    this.time.paused = false;
  };

  private readonly handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }): void => {
    if (slot === 0) {
      // stash: 5초간 낙하 정지. 이미 활성화 중이면 무시
      if (this.stashTimeoutId !== null) return;
      this.tweens.pauseAll();
      this.time.paused = true;
      this.stashTimeoutId = setTimeout(() => {
        this.stashTimeoutId = null;
        if (!this.isGameEnded && !this.isUserPaused) {
          this.tweens.resumeAll();
          this.time.paused = false;
        }
      }, 5000);
    } else if (slot === 1) {
      // cherry-pick: 낙하 정지 후 발바닥 애니메이션, 완료 처리
      if (this.isGameEnded || this.commandIndex >= this.commandSet.length) return;
      if (this.cherryPickTimeoutId !== null) return; // 중복 방지
      const indexAtUse = this.commandIndex;
      this.tweens.pauseAll();
      this.time.paused = true;
      this.cherryPickTimeoutId = setTimeout(() => {
        this.cherryPickTimeoutId = null;
        if (!this.isGameEnded) {
          if (!this.isUserPaused) {
            this.tweens.resumeAll();
            this.time.paused = false;
          }
          EventBus.emit('command:complete', { index: indexAtUse });
        }
      }, CHERRY_PICK_ANIM_MS);
    }
  };

  private readonly handleGameStart = (): void => {
    // 튜토리얼 모드: 타이머 없이 useTutorialMode의 tutorial:show_command를 기다림
    if (this.isTutorialMode) return;
    this.startTimer();
    this.showCurrentCommand();
  };

  /** 튜토리얼 전용: 현재 콌맨드를 레인 상단에서 TUTORIAL_FALL_DURATION_MS 동안 freeze Y까지 낙하시킵니다. */
  private readonly handleTutorialShowCommand = (): void => {
    if (this.commandIndex >= this.commandSet.length) return;
    const cmd = this.commandSet[this.commandIndex];
    const freezeY = this.scale.height * 0.45;
    this.lanes.get(cmd.branchName)?.startTutorialFall(cmd, freezeY, TUTORIAL_FALL_DURATION_MS);
  };

  /** 튜토리얼 전용: 낙하 중인 콌맨드를 현위치에 멈춰 점선 깜빡임 인디케이터를 표시합니다. */
  private readonly handleTutorialFreezeCommand = (): void => {
    if (this.commandIndex >= this.commandSet.length) return;
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.freezeWithBlink();
  };

  private readonly handleGameRestart = (data: GameRestartPayload): void => {
    // payload로 받은 새 세션 데이터를 그대로 scene.restart에 넘겨 create()에서 새 commandSet/sessionId로 초기화.
    // autoStart: true → create()에서 StartModal 없이 바로 게임 시작.
    this.scene.restart({
      sessionId: data.sessionId,
      difficulty: data.difficulty,
      commandSet: data.commandSet as Command[],
      isTutorial: data.isTutorial,
      autoStart: true,
    });
  };

  private readonly handleGameEnd = (): void => {
    this.isGameEnded = true;
    this.timerEvent?.remove();
    this.timerEvent = null;
    if (this.stashTimeoutId !== null) {
      clearTimeout(this.stashTimeoutId);
      this.stashTimeoutId = null;
    }
    if (this.cherryPickTimeoutId !== null) {
      clearTimeout(this.cherryPickTimeoutId);
      this.cherryPickTimeoutId = null;
    }
    this.lanes.forEach((lane) => lane.clearCommand());
  };
}
