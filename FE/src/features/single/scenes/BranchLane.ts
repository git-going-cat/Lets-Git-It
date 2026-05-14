import Phaser from 'phaser';

import type { ItemType, SingleCommand } from '../types/single.types';

const BRANCH_COLORS: Record<string, { line: number; text: string }> = {
  main: { line: 0x3b82f6, text: '#60a5fa' },
  feature: { line: 0xa855f7, text: '#c084fc' },
  hotfix: { line: 0xef4444, text: '#f87171' },
  develop: { line: 0x22c55e, text: '#4ade80' },
};
const FALLBACK_COLORS = [
  { line: 0xa855f7, text: '#c084fc' },
  { line: 0x22c55e, text: '#4ade80' },
  { line: 0xf97316, text: '#fb923c' },
  { line: 0xeab308, text: '#fbbf24' },
];
const DEFAULT_COLOR = { line: 0x6b7280, text: '#9ca3af' };

const BRIGHT_COLORS: Record<string, number> = {
  main: 0x93c5fd, // 밝은 파랑
  feature: 0xe0aaff, // 밝은 보라
  hotfix: 0xfca5a5, // 밝은 빨강
  develop: 0x6ee7b7, // 밝은 초록
};
const LINE_TO_BRIGHT: Record<number, number> = Object.fromEntries(
  Object.entries(BRANCH_COLORS).map(([k, v]) => [v.line, BRIGHT_COLORS[k]])
);

const PIXEL_FONT = "'NeoDunggeunGothicPro', monospace";

const LANE = {
  LINE_WIDTH: 2,
  LINE_ALPHA: 0.7,
  LABEL_OFFSET_Y: 20,
  LABEL_FONT_SIZE: '28px',
} as const;

const NODE = {
  RADIUS: 14,
  BORDER_WIDTH: 4,
  GLOW_RADIUS: 24,
  GLOW_ALPHA: 0.2,
  BG_COLOR: 0x0d1117,
  // 텍스트는 원 위쪽에 배치 (origin bottom-center)
  TEXT_OFFSET_Y: -28, // 원 중심 기준 위쪽 거리
  TEXT_GAP: 14, // 원 상단과 텍스트 하단 사이 여백
  TEXT_FONT_SIZE: '28px',
  TEXT_COLOR: '#e0e0ff',
  TEXT_BG_COLOR: '#000000cc',
  TEXT_MAX_WIDTH: 420,
  TEXT_BG_PADDING_X: 12,
  TEXT_BG_PADDING_Y: 8,
  START_Y: -80,
  END_OVERSHOOT: 60,
} as const;

/**
 * 브랜치 레인 렌더링 컨테이너.
 * 세로 라인, 브랜치 레이블, 낙하 명령어 노드를 관리하며
 * 활성 글로우·miss 플래시 애니메이션을 제공합니다.
 */
export class BranchLane extends Phaser.GameObjects.Container {
  private readonly laneWidth: number;
  private readonly canvasHeight: number;
  private readonly branchColor: { line: number; text: string };
  private commandNodes: Phaser.GameObjects.Container[] = [];
  private flashGraphic: Phaser.GameObjects.Graphics | null = null;
  private activeGlow: Phaser.GameObjects.Graphics | null = null;
  private blinkIndicator: Phaser.GameObjects.Graphics | null = null;
  // 페이드 트윈 진행 중에도 즉시 판별 가능한 명시 플래그. `this.alpha`는 트윈 시작 직후
  // 첫 프레임까지 0일 수 있어 spawn 가드로 신뢰하기 어렵다.
  private revealed = true;

  constructor(scene: Phaser.Scene, laneIndex: number, totalLanes: number, branchName: string) {
    const canvasHeight = scene.scale.height;
    const laneWidth = scene.scale.width / totalLanes;
    super(scene, laneIndex * laneWidth, 0);

    this.laneWidth = laneWidth;
    this.canvasHeight = canvasHeight;
    this.branchColor =
      BRANCH_COLORS[branchName] ??
      FALLBACK_COLORS[laneIndex % FALLBACK_COLORS.length] ??
      DEFAULT_COLOR;

    this.drawBranchLine();
    this.drawBranchLabel(branchName);
    scene.add.existing(this);
  }

  /** 명령어 노드를 상단에서 하단까지 낙하시킵니다. EASY/NORMAL 래퍼: 기존 노드를 모두 지운 뒤 새 노드를 하나 추가합니다. */
  showCommand(command: SingleCommand, fallDuration: number, onTimeout: () => void): void {
    this.clearAll();
    this.enqueueCommand(command, fallDuration, onTimeout);
  }

  /** 노드를 큐 끝에 추가하고 낙하 트윈을 시작합니다. HARD 모드 시간차 spawn에서 직접 호출됩니다. */
  enqueueCommand(command: SingleCommand, fallDuration: number, onTimeout: () => void): void {
    const node = this.buildNode(command.text, command.itemDrop);
    node.setPosition(this.laneWidth / 2, NODE.START_Y);
    this.add(node);
    this.commandNodes.push(node);

    const tween = this.scene.tweens.add({
      targets: node,
      y: this.canvasHeight + NODE.END_OVERSHOOT,
      duration: fallDuration,
      ease: 'Linear',
      onComplete: () => onTimeout(),
    });
    node.setData('tween', tween);
  }

  /** 최하단(가장 먼저 spawn된) 노드를 즉시 제거합니다. 성공·실패 공통 노드 삭제 경로입니다. */
  removeBottomNode(): void {
    const node = this.commandNodes.shift();
    if (!node) return;
    (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();
    node.destroy();
  }

  /** 모든 노드와 트윈을 즉시 제거합니다. game:end / restart 시 호출됩니다. */
  clearAll(): void {
    this.blinkIndicator = null;
    for (const node of this.commandNodes) {
      (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();
      node.destroy();
    }
    this.commandNodes = [];
  }

  /** 이 레인이 화면에 표시되는 상태인지 반환합니다. SingleScene의 HARD 시간차 spawn 가드에서 사용됩니다. */
  isRevealed(): boolean {
    return this.revealed;
  }

  /** 초기 숨김 처리. SingleScene의 initLanes에서 main 이외 브랜치에 호출됩니다. */
  setHidden(): void {
    this.revealed = false;
    this.setAlpha(0);
  }

  /**
   * 튜토리얼 전용: 명령어 노드를 상단에서 targetY까지 fallDuration ms 동안 낙하시킵니다.
   * 낙하 완료 후 자동으로 위치가 고정됩니다.
   */
  startTutorialFall(command: SingleCommand, targetY: number, fallDuration: number): void {
    this.clearAll();
    const node = this.buildNode(command.text);
    node.setPosition(this.laneWidth / 2, NODE.START_Y);
    this.add(node);
    this.commandNodes.push(node);

    const tween = this.scene.tweens.add({
      targets: node,
      y: targetY,
      duration: fallDuration,
      ease: 'Cubic.easeOut',
    });
    node.setData('tween', tween);
  }

  /**
   * 튜토리얼 전용: 낙하 중인 명령어를 현재 위치에서 멈추고 점선 깜빡임 인디케이터를 표시합니다.
   */
  freezeWithBlink(): void {
    const node = this.commandNodes[0];
    if (!node) return;
    const tween = node.getData('tween') as Phaser.Tweens.Tween | undefined;
    if (tween) {
      tween.stop();
      node.setData('tween', null);
    }
    this.addBlinkIndicator();
  }

  /** 명령어 원 주변에 점선 깜빡임 인디케이터를 추가합니다. */
  private addBlinkIndicator(): void {
    const node = this.commandNodes[0];
    if (!node || this.blinkIndicator) return;

    const brightColor = LINE_TO_BRIGHT[this.branchColor.line] ?? 0xffffff;

    const r = NODE.RADIUS + 10;
    const TOTAL_SEGS = 14;
    const g = this.scene.add.graphics();
    g.lineStyle(3, brightColor, 1); // 더 굵고 밝은 색상
    for (let i = 0; i < TOTAL_SEGS; i++) {
      if (i % 2 !== 0) continue; // 짝수 세그먼트만 그려서 점선 효과
      const startAngle = (i / TOTAL_SEGS) * Math.PI * 2;
      const endAngle = ((i + 0.65) / TOTAL_SEGS) * Math.PI * 2;
      g.beginPath();
      g.arc(0, 0, r, startAngle, endAngle);
      g.strokePath();
    }
    node.add(g);
    this.blinkIndicator = g;

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** 비활성(alpha=0) 레인을 페이드인으로 표시합니다. CREATE 명령어 완료 시 호출됩니다. */
  revealLane(): void {
    this.revealed = true;
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 500, ease: 'Power2' });
  }

  /** 레인을 페이드아웃으로 숨깁니다. MERGE 명령어 완료 시 병합된 브랜치에 호출됩니다. */
  hideLane(): void {
    this.revealed = false;
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 500, ease: 'Power2' });
  }

  /** 활성 브랜치 여부에 따라 레인 배경 글로우를 표시하거나 숨깁니다. */
  setLaneActive(isActive: boolean): void {
    if (isActive && !this.activeGlow) {
      const glow = this.scene.add.graphics();
      glow.fillStyle(this.branchColor.line, 0.12);
      glow.fillRect(0, 0, this.laneWidth, this.canvasHeight);
      glow.setAlpha(0);
      this.addAt(glow, 0);
      this.activeGlow = glow;
      this.scene.tweens.add({ targets: glow, alpha: 1, duration: 300, ease: 'Power2' });
    } else if (!isActive && this.activeGlow) {
      const glow = this.activeGlow;
      this.activeGlow = null;
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => glow.destroy(),
      });
    }
  }

  /** 최하단 노드를 터뜨리고 녹색 링을 방사합니다. 명령어 성공 시 호출됩니다. */
  flashSuccess(): void {
    const node = this.commandNodes.shift();
    if (!node) return;

    (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();
    const nodeY = node.y;

    // 녹색 링 방사 (노드 위치 기준으로 바깥으로 확장)
    const ring = this.scene.add.graphics();
    ring.setPosition(this.laneWidth / 2, nodeY);
    ring.lineStyle(3, 0x4ade80, 0.9);
    ring.strokeCircle(0, 0, NODE.RADIUS);
    this.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 380,
      ease: 'Power2.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 노드 폭발: 약간 확대되며 페이드아웃
    this.scene.tweens.add({
      targets: node,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 260,
      ease: 'Power2.easeOut',
      onComplete: () => node.destroy(),
    });
  }

  /** 레인 하단에 빨간 플래시 애니메이션을 재생합니다. 명령어 시간 초과(miss) 시 호출됩니다. */
  flashMiss(): void {
    if (this.flashGraphic) {
      this.flashGraphic.destroy();
    }
    const flash = this.scene.add.graphics();
    this.flashGraphic = flash;
    flash.fillStyle(0xef4444, 0.6);
    flash.fillRect(0, this.canvasHeight - NODE.END_OVERSHOOT, this.laneWidth, NODE.END_OVERSHOOT);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        if (this.flashGraphic === flash) this.flashGraphic = null;
        flash.destroy();
      },
    });
  }

  private drawBranchLine(): void {
    const x = this.laneWidth / 2;
    const g = this.scene.add.graphics();
    g.lineStyle(LANE.LINE_WIDTH, this.branchColor.line, LANE.LINE_ALPHA);
    g.lineBetween(x, 0, x, this.canvasHeight);
    this.add(g);
  }

  private drawBranchLabel(name: string): void {
    const label = this.scene.add
      .text(this.laneWidth / 2, LANE.LABEL_OFFSET_Y, name, {
        fontSize: LANE.LABEL_FONT_SIZE,
        fontFamily: PIXEL_FONT,
        color: this.branchColor.text,
      })
      .setOrigin(0.5, 0);
    this.add(label);
  }

  private static readonly ITEM_ICONS: Record<string, string> = {
    stash: '≡',
    'cherry-pick': '◆',
    restore: '♥',
  };

  private buildNode(text: string, itemDrop?: ItemType): Phaser.GameObjects.Container {
    const { line: color } = this.branchColor;

    const g = this.scene.add.graphics();

    if (itemDrop) {
      // 아이템 노드: 브랜치 색상으로 완전 채움 + 흰 테두리 + 강한 글로우
      g.fillStyle(color, 0.5);
      g.fillCircle(0, 0, NODE.GLOW_RADIUS + 4);
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, NODE.RADIUS);
      g.lineStyle(NODE.BORDER_WIDTH, 0xffffff, 0.9);
      g.strokeCircle(0, 0, NODE.RADIUS);
    } else {
      // 일반 노드
      g.fillStyle(color, NODE.GLOW_ALPHA);
      g.fillCircle(0, 0, NODE.GLOW_RADIUS);
      g.fillStyle(NODE.BG_COLOR, 1);
      g.fillCircle(0, 0, NODE.RADIUS);
      g.lineStyle(NODE.BORDER_WIDTH, color, 1);
      g.strokeCircle(0, 0, NODE.RADIUS);
    }

    // 원 아래쪽에 명령어 텍스트 배치
    const textY = NODE.RADIUS + NODE.TEXT_GAP;
    const label = this.scene.add
      .text(0, textY, text, {
        fontSize: NODE.TEXT_FONT_SIZE,
        fontFamily: PIXEL_FONT,
        color: NODE.TEXT_COLOR,
        align: 'center',
        wordWrap: { width: NODE.TEXT_MAX_WIDTH },
        backgroundColor: NODE.TEXT_BG_COLOR,
        padding: {
          x: NODE.TEXT_BG_PADDING_X,
          y: NODE.TEXT_BG_PADDING_Y,
        },
      })
      .setOrigin(0.5, 0); // top-center anchor → 텍스트 상단이 textY에 위치

    // 좌우 끝 레인에서 텍스트가 캔버스 밖으로 잘리지 않도록 x 위치를 클램핑
    const EDGE_PADDING = 8;
    const nodeWorldX = this.x + this.laneWidth / 2;
    const canvasWidth = this.scene.scale.width;
    const hw = label.width / 2;
    if (nodeWorldX - hw < EDGE_PADDING) {
      label.setX(hw - nodeWorldX + EDGE_PADDING);
    } else if (nodeWorldX + hw > canvasWidth - EDGE_PADDING) {
      label.setX(canvasWidth - nodeWorldX - hw - EDGE_PADDING);
    }

    const node = this.scene.add.container(0, 0);
    node.add([g, label]);

    if (itemDrop) {
      const icon = this.scene.add
        .text(0, 0, BranchLane.ITEM_ICONS[itemDrop] ?? '★', {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5);
      node.add(icon);
    }

    return node;
  }
}
