import Phaser from 'phaser';

import type { Command } from '../types/single.types';

const BRANCH_COLORS: Record<string, { line: number; text: string }> = {
  main: { line: 0x3b82f6, text: '#60a5fa' },
  feature: { line: 0xa855f7, text: '#c084fc' },
  hotfix: { line: 0xef4444, text: '#f87171' },
  develop: { line: 0x22c55e, text: '#4ade80' },
};
const DEFAULT_COLOR = { line: 0x6b7280, text: '#9ca3af' };

const PIXEL_FONT = "'Press Start 2P', monospace";

const LANE = {
  LINE_WIDTH: 2,
  LINE_ALPHA: 0.7,
  LABEL_OFFSET_Y: 16,
  LABEL_FONT_SIZE: '14px',
} as const;

const NODE = {
  RADIUS: 14,
  BORDER_WIDTH: 4,
  GLOW_RADIUS: 24,
  GLOW_ALPHA: 0.2,
  BG_COLOR: 0x0d1117,
  // 텍스트는 원 위쪽에 배치 (origin bottom-center)
  TEXT_OFFSET_Y: -28, // 원 중심 기준 위쪽 거리
  TEXT_GAP: 10, // 원 상단과 텍스트 하단 사이 여백
  TEXT_FONT_SIZE: '13px',
  TEXT_COLOR: '#e0e0ff',
  TEXT_MAX_WIDTH: 260,
  TEXT_BG_COLOR: '#000000cc',
  TEXT_BG_PADDING_X: 10,
  TEXT_BG_PADDING_Y: 6,
  START_Y: -100,
  END_OVERSHOOT: 60,
} as const;

export class BranchLane extends Phaser.GameObjects.Container {
  private readonly laneWidth: number;
  private readonly canvasHeight: number;
  private readonly branchColor: { line: number; text: string };
  private commandNode: Phaser.GameObjects.Container | null = null;
  private fallTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, laneIndex: number, totalLanes: number, branchName: string) {
    const canvasHeight = scene.scale.height;
    const laneWidth = scene.scale.width / totalLanes;
    super(scene, laneIndex * laneWidth, 0);

    this.laneWidth = laneWidth;
    this.canvasHeight = canvasHeight;
    this.branchColor = BRANCH_COLORS[branchName] ?? DEFAULT_COLOR;

    this.drawBranchLine();
    this.drawBranchLabel(branchName);
    scene.add.existing(this);
  }

  showCommand(command: Command, fallDuration: number, onTimeout: () => void): void {
    this.clearCommand();

    const node = this.buildNode(command.displayText);
    node.setPosition(this.laneWidth / 2, NODE.START_Y);
    this.add(node);
    this.commandNode = node;

    this.fallTween = this.scene.tweens.add({
      targets: node,
      y: this.canvasHeight + NODE.END_OVERSHOOT,
      duration: fallDuration,
      ease: 'Linear',
      onComplete: () => {
        this.fallTween = null;
        onTimeout();
      },
    });
  }

  clearCommand(): void {
    if (this.fallTween) {
      this.fallTween.stop();
      this.fallTween = null;
    }
    if (this.commandNode) {
      this.commandNode.destroy();
      this.commandNode = null;
    }
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

  private buildNode(text: string): Phaser.GameObjects.Container {
    const { line: color } = this.branchColor;

    const g = this.scene.add.graphics();

    // 글로우
    g.fillStyle(color, NODE.GLOW_ALPHA);
    g.fillCircle(0, 0, NODE.GLOW_RADIUS);

    // 배경
    g.fillStyle(NODE.BG_COLOR, 1);
    g.fillCircle(0, 0, NODE.RADIUS);

    // 테두리
    g.lineStyle(NODE.BORDER_WIDTH, color, 1);
    g.strokeCircle(0, 0, NODE.RADIUS);

    // 원 위쪽에 명령어 텍스트 배치
    const textY = -(NODE.RADIUS + NODE.TEXT_GAP);
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
      .setOrigin(0.5, 1); // bottom-center anchor → 텍스트 하단이 textY에 위치

    const node = this.scene.add.container(0, 0);
    node.add([g, label]);
    return node;
  }
}
