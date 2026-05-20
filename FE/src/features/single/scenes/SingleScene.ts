import Phaser from 'phaser';

import { parseAddTarget, parseSwitchTarget } from '@/shared/game/branchParser';
import { generateArrowSequence } from '@/shared/game/conflictArrows';

import { singleBus } from '../bridge/singleBus';
import { CONFLICT_SEQUENCE_LENGTH, DEFAULT_CONFLICT_FILE } from '../constants/conflict';
import { CHERRY_PICK_ANIM_MS } from '../constants/itemAnimations';
import { TUTORIAL_FALL_DURATION_MS } from '../constants/tutorialData';

import { BranchLane } from './BranchLane';

import type { GameRestartPayload } from '../bridge/singleBus';
import type { SingleCommand, SingleSceneData } from '../types/single.types';
import type { Difficulty } from '@/shared/types/game.types';

/**
 * 난이도별 명령어 낙하 시간 (ms).
 * EASY 명령어 수가 적고 느리게 떨어지며, HARD는 많고 빠르게 떨어진다.
 * 두 변수(낙하 속도 × 명령어 수)의 곱이 전체 게임 시간을 결정한다.
 */
const FALL_DURATION_MS: Record<Difficulty, number> = {
  EASY: 25_000,
  NORMAL: 15_000,
  HARD: 12_000,
};

const TIMER_INTERVAL_MS = 100;

/**
 * 싱글 플레이 메인 씬.
 * 레인 렌더링, 명령어 낙하 타이머, singleBus 기반 React ↔ Phaser 통신을 담당합니다.
 * 게임 이벤트(complete/miss/pause/resume/restart/item:use)를 처리하며
 * 게임 종료 시 모든 Phaser 타이머·트윈을 정리합니다.
 */
export class SingleScene extends Phaser.Scene {
  private commandSet: SingleCommand[] = [];
  private commandIndex = 0;
  private difficulty: Difficulty = 'NORMAL';
  private fallDuration = FALL_DURATION_MS.NORMAL;
  private lastSpawnedIndex = -1;
  private hardSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private lanes = new Map<string, BranchLane>();
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private elapsedMs = 0;
  private isGameEnded = false;
  private isUserPaused = false;
  private isConflictActive = false;
  private stashTimeoutId: Phaser.Time.TimerEvent | null = null;
  private cherryPickTimeoutId: Phaser.Time.TimerEvent | null = null;
  private isTutorialMode = false;
  // scene.restart() 시 인스턴스가 보존되므로, 라이프사이클 핸들러를 1회만 등록하기 위한 가드.
  private lifecycleHandlersRegistered = false;

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
    // scene.restart()는 인스턴스를 보존하므로 ESC(handleGamePause)가 set한 isUserPaused와
    // tweens.pauseAll() 상태가 새 세션으로 흘러들어온다. 매 create()마다 명시적으로 초기화.
    this.isUserPaused = false;
    this.isConflictActive = false;
    this.difficulty = difficulty;
    this.lastSpawnedIndex = -1;
    this.isTutorialMode = raw.isTutorial ?? false;
    this.fallDuration = FALL_DURATION_MS[difficulty];

    this.initLanes(commandSet);
    this.lanes.forEach((lane, branchName) => lane.setLaneActive(branchName === 'main'));
    // 튜토리얼: 다른 레인의 노드를 미리 보여줘야 하므로 모든 레인을 처음부터 표시
    if (this.isTutorialMode) {
      this.lanes.forEach((lane) => lane.revealLane());
    }
    this.tweens.resumeAll();
    this.registerEvents();

    // autoStart: 재시작(restart) 경로에서만 true. 최초 진입은 StartModal의 game:start를 기다린다.
    if (autoStart) {
      this.startTimer();
      this.showCurrentCommand();
    }

    // scene.restart()는 SHUTDOWN을 emit하지만 인스턴스/이벤터를 보존하므로
    // SHUTDOWN 핸들러는 한 번만 등록한다. singleBus 리스너는 shutdown()에서 off되고
    // 다음 create()의 registerEvents()로 다시 붙는다.
    // game.destroy() 시 Phaser가 shutdown()을 보장하지 않는 버전이 있어 DESTROY도 함께 연결.
    if (!this.lifecycleHandlersRegistered) {
      this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      this.game.events.once(Phaser.Core.Events.DESTROY, this.shutdown, this);
      this.lifecycleHandlersRegistered = true;
    }
  }

  shutdown(): void {
    this.timerEvent?.remove();
    this.timerEvent = null;
    if (this.hardSpawnTimer) {
      this.hardSpawnTimer.remove();
      this.hardSpawnTimer = null;
    }
    this.lanes.clear();
    if (this.stashTimeoutId !== null) {
      this.stashTimeoutId.remove();
      this.stashTimeoutId = null;
      singleBus.emit('stash:end');
    }
    if (this.cherryPickTimeoutId !== null) {
      this.cherryPickTimeoutId.remove();
      this.cherryPickTimeoutId = null;
      singleBus.emit('cherry-pick:end');
    }

    singleBus.off('game:start', this.handleGameStart);
    singleBus.off('command:complete', this.handleCommandComplete);
    singleBus.off('branch:switch', this.handleBranchSwitch);
    singleBus.off('lane:create', this.handleLaneCreate);
    singleBus.off('game:pause', this.handleGamePause);
    singleBus.off('game:resume', this.handleGameResume);
    singleBus.off('game:restart', this.handleGameRestart);
    singleBus.off('game:over', this.handleGameEnd);
    singleBus.off('game:session-expired', this.handleGameEnd);
    singleBus.off('game:complete', this.handleGameEnd);
    singleBus.off('item:use', this.handleItemUse);
    singleBus.off('tutorial:show-command', this.handleTutorialShowCommand);
    singleBus.off('tutorial:freeze-command', this.handleTutorialFreezeCommand);
    singleBus.off('conflict:start', this.handleConflictStart);
    singleBus.off('conflict:resolve', this.handleConflictResolve);
  }

  private initLanes(commandSet: SingleCommand[]): void {
    const branches = Array.from(new Set(commandSet.map((c) => c.branchName)));
    this.lanes.clear();
    branches.forEach((branch, i) => {
      const lane = new BranchLane(this, i, branches.length, branch);
      if (branch !== 'main') lane.setHidden();
      this.lanes.set(branch, lane);
    });
  }

  private registerEvents(): void {
    singleBus.on('game:start', this.handleGameStart);
    singleBus.on('command:complete', this.handleCommandComplete);
    singleBus.on('branch:switch', this.handleBranchSwitch);
    singleBus.on('lane:create', this.handleLaneCreate);
    singleBus.on('game:pause', this.handleGamePause);
    singleBus.on('game:resume', this.handleGameResume);
    singleBus.on('game:restart', this.handleGameRestart);
    singleBus.on('game:over', this.handleGameEnd);
    singleBus.on('game:session-expired', this.handleGameEnd);
    singleBus.on('game:complete', this.handleGameEnd);
    singleBus.on('item:use', this.handleItemUse);
    singleBus.on('tutorial:show-command', this.handleTutorialShowCommand);
    singleBus.on('tutorial:freeze-command', this.handleTutorialFreezeCommand);
    singleBus.on('conflict:start', this.handleConflictStart);
    singleBus.on('conflict:resolve', this.handleConflictResolve);
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: TIMER_INTERVAL_MS,
      loop: true,
      callback: () => {
        this.elapsedMs += TIMER_INTERVAL_MS;
        singleBus.emit('timer:tick', this.elapsedMs);
      },
    });
  }

  private showCurrentCommand(): void {
    // HARD 미리보기 타이머가 남아 있으면 취소 (사용자가 60% 시점보다 빨리 완료한 경우)
    if (this.hardSpawnTimer) {
      this.hardSpawnTimer.remove();
      this.hardSpawnTimer = null;
    }
    if (this.isGameEnded) return;
    if (this.commandIndex >= this.commandSet.length) {
      singleBus.emit('game:complete');
      return;
    }
    const cmd = this.commandSet[this.commandIndex];
    this.lanes.get(cmd.branchName)?.showCommand(cmd, this.fallDuration, () => {
      this.onCommandTimeout();
    });
    this.lastSpawnedIndex = this.commandIndex;
    if (this.difficulty === 'HARD') {
      this.scheduleNextHardSpawn();
    }
  }

  /** HARD 전용: fallDuration × 0.6 후 다음 명령어를 미리 spawn합니다. */
  private scheduleNextHardSpawn(): void {
    this.hardSpawnTimer = this.time.delayedCall(this.fallDuration * 0.6, () => {
      this.hardSpawnTimer = null;
      this.spawnNextHard();
    });
  }

  /** HARD 전용: 다음 commandIndex 노드를 해당 레인이 표시된 경우에만 enqueue합니다. */
  private spawnNextHard(): void {
    if (this.isGameEnded) return;
    const nextIndex = this.lastSpawnedIndex + 1;
    if (nextIndex >= this.commandSet.length) return;
    const nextCmd = this.commandSet[nextIndex];
    const nextLane = this.lanes.get(nextCmd.branchName);
    // 레인이 아직 reveal되지 않은 경우(CREATE 완료 전) spawn skip.
    // command:complete → applyBranchEffect → revealLane 이후 handleCommandComplete에서 spawn.
    if (!nextLane?.isRevealed()) return;
    nextLane.enqueueCommand(nextCmd, this.fallDuration, () => {
      this.onCommandTimeout();
    });
    this.lastSpawnedIndex = nextIndex;
    this.scheduleNextHardSpawn();
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
    // HARD: 같은 레인에 노드가 2개일 수 있으므로 최하단 노드만 제거한다.
    // EASY/NORMAL: 노드가 1개뿐이므로 removeBottomNode와 clearAll은 동일 효과.
    lane?.removeBottomNode();
    lane?.flashMiss();
    this.commandIndex++;
    singleBus.emit('command:miss', { index: missedIndex }); // lives 감소 먼저
    // miss여도 브랜치 구조 변경은 반드시 적용해야 이후 커맨드 진행이 가능
    this.applyBranchEffect(cmd);
    if (!this.isGameEnded && this.lastSpawnedIndex < this.commandIndex) {
      this.showCurrentCommand();
    }
  }

  // CREATE·SWITCH: 레인 공개 및 브랜치 전환 / MERGE·CONFLICT: 병합된 레인 숨김
  // CONFLICT 미니게임 성공 시 conflict:resolve → command:complete 로 들어와 이 분기를 거친다.
  private applyBranchEffect(cmd: SingleCommand): void {
    if (cmd.type === 'CREATE' || cmd.type === 'SWITCH') {
      const target = parseSwitchTarget(cmd.text);
      if (target) {
        singleBus.emit('branch:switch', { branch: target });
        if (cmd.type === 'CREATE') singleBus.emit('lane:create', { branch: target });
      }
    } else if (cmd.type === 'MERGE' || cmd.type === 'CONFLICT') {
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
      this.stashTimeoutId.remove();
      this.stashTimeoutId = null;
      if (!this.isUserPaused) {
        this.tweens.resumeAll();
        if (this.timerEvent) this.timerEvent.paused = false;
        if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
      }
      singleBus.emit('stash:end');
    }

    // 튜토리얼 모드: useTutorialMode가 tutorial:show-command를 emit할 때까지 대기
    // HARD: 다음 명령어가 이미 화면에 있으면 spawn skip (look-ahead 타이머가 계속 돌고 있음)
    if (!this.isTutorialMode && this.lastSpawnedIndex < this.commandIndex) {
      this.showCurrentCommand();
    }
  };

  private readonly handleGamePause = (): void => {
    this.isUserPaused = true;
    this.tweens.pauseAll();
    if (this.timerEvent) this.timerEvent.paused = true;
    // ESC pause 중에 stash/cherry-pick delayedCall이 발화하면 command:complete가 emit되어
    // commandIndex가 진행되고 노드가 한 칸 점프하는 현상이 생긴다. delayedCall도 명시적으로 정지.
    if (this.stashTimeoutId) this.stashTimeoutId.paused = true;
    if (this.cherryPickTimeoutId) this.cherryPickTimeoutId.paused = true;
    if (this.hardSpawnTimer) this.hardSpawnTimer.paused = true;
  };

  private readonly handleGameResume = (): void => {
    this.isUserPaused = false;
    // stash/cherry-pick 활성 중이면 해당 delayedCall만 재개하고 tween/timerEvent/hardSpawnTimer는 그대로.
    // 콜백 완료 시점에 모두 정상 재개된다.
    if (this.stashTimeoutId !== null) {
      this.stashTimeoutId.paused = false;
      return;
    }
    if (this.cherryPickTimeoutId !== null) {
      this.cherryPickTimeoutId.paused = false;
      return;
    }
    // 미니게임이 진행 중이면 tween/hardSpawnTimer는 그대로 두고 게임 타이머만 재개.
    // 미니게임이 끝나는 시점(handleConflictResolve)에 나머지가 재개된다.
    if (this.isConflictActive) {
      if (this.timerEvent) this.timerEvent.paused = false;
      return;
    }
    this.tweens.resumeAll();
    if (this.timerEvent) this.timerEvent.paused = false;
    if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
  };

  // CONFLICT 미니게임 시작/종료에 맞춘 일시정지·재개.
  // 게임 시간(timerEvent)은 그대로 흐르고 명령어 낙하(tween)와 HARD 미리 스폰만 멈춘다.
  // ESC pause와 직교해야 하므로 isUserPaused는 건드리지 않는다.
  private readonly handleConflictStart = (): void => {
    this.isConflictActive = true;
    this.tweens.pauseAll();
    if (this.hardSpawnTimer) this.hardSpawnTimer.paused = true;
  };

  private readonly handleConflictResolve = (): void => {
    this.isConflictActive = false;
    // ESC pause가 동시에 진행 중이면 재개 보류 — game:resume 시점에 함께 풀린다.
    if (this.isUserPaused) return;
    this.tweens.resumeAll();
    if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
  };

  private readonly handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }): void => {
    if (slot === 0) {
      // stash: 5초간 낙하 정지. 이미 활성화 중이면 무시.
      // ESC pause 시 stashTimeoutId.paused를 handleGamePause에서 명시적으로 토글한다.
      if (this.stashTimeoutId !== null) return;
      this.tweens.pauseAll();
      if (this.timerEvent) this.timerEvent.paused = true;
      if (this.hardSpawnTimer) this.hardSpawnTimer.paused = true;
      this.stashTimeoutId = this.time.delayedCall(5000, () => {
        this.stashTimeoutId = null;
        if (!this.isGameEnded && !this.isUserPaused) {
          this.tweens.resumeAll();
          if (this.timerEvent) this.timerEvent.paused = false;
          if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
        }
        singleBus.emit('stash:end');
      });
    } else if (slot === 1) {
      // cherry-pick: 낙하 정지 후 발바닥 애니메이션, 완료 처리
      if (this.isGameEnded || this.commandIndex >= this.commandSet.length) return;
      if (this.cherryPickTimeoutId !== null) return; // 중복 방지
      const indexAtUse = this.commandIndex;
      this.tweens.pauseAll();
      if (this.timerEvent) this.timerEvent.paused = true;
      if (this.hardSpawnTimer) this.hardSpawnTimer.paused = true;
      this.cherryPickTimeoutId = this.time.delayedCall(CHERRY_PICK_ANIM_MS, () => {
        this.cherryPickTimeoutId = null;
        if (!this.isGameEnded) {
          const cmd = this.commandSet[indexAtUse];
          if (cmd?.type === 'CONFLICT') {
            // CONFLICT는 미니게임을 거쳐야 완료된다. tween/hardSpawnTimer는 handleConflictStart가
            // 다시 멈춰 두므로 여기서 재개하지 않고 게임 타이머만 재개한다.
            if (!this.isUserPaused && this.timerEvent) this.timerEvent.paused = false;
            singleBus.emit('conflict:start', {
              index: indexAtUse,
              sequence: generateArrowSequence(CONFLICT_SEQUENCE_LENGTH),
              headBranch: cmd.branchName,
              incomingBranch: parseSwitchTarget(cmd.text) ?? 'incoming',
              filePath:
                parseAddTarget(this.commandSet[indexAtUse + 1]?.text) ?? DEFAULT_CONFLICT_FILE,
            });
          } else {
            if (!this.isUserPaused) {
              this.tweens.resumeAll();
              if (this.timerEvent) this.timerEvent.paused = false;
              if (this.hardSpawnTimer) this.hardSpawnTimer.paused = false;
            }
            singleBus.emit('command:complete', { index: indexAtUse });
          }
        }
        singleBus.emit('cherry-pick:end');
      });
    }
  };

  private readonly handleGameStart = (): void => {
    // 튜토리얼 모드: 타이머 없이 useTutorialMode의 tutorial:show-command를 기다림
    if (this.isTutorialMode) return;
    // idle 상태에서 ESC → game:pause → resume(game:resume 미발행)로 tweens.pauseAll()이
    // 호출된 채 game:start에 도달할 수 있다. 게임 시작 시점에 TweenManager를 반드시 재개한다.
    this.isUserPaused = false;
    this.tweens.resumeAll();
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
      commandSet: data.commandSet as SingleCommand[],
      isTutorial: data.isTutorial,
      autoStart: true,
    });
  };

  private readonly handleGameEnd = (): void => {
    this.isGameEnded = true;
    this.timerEvent?.remove();
    this.timerEvent = null;
    if (this.hardSpawnTimer) {
      this.hardSpawnTimer.remove();
      this.hardSpawnTimer = null;
    }
    if (this.stashTimeoutId !== null) {
      this.stashTimeoutId.remove();
      this.stashTimeoutId = null;
      singleBus.emit('stash:end');
    }
    if (this.cherryPickTimeoutId !== null) {
      this.cherryPickTimeoutId.remove();
      this.cherryPickTimeoutId = null;
      singleBus.emit('cherry-pick:end');
    }
    this.lanes.forEach((lane) => lane.clearAll());
  };
}
