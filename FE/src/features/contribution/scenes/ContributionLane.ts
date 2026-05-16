import Phaser from 'phaser';

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
  { line: 0x06b6d4, text: '#22d3ee' },
];
const DEFAULT_COLOR = { line: 0x6b7280, text: '#9ca3af' };

const PIXEL_FONT = "'NeoDunggeunGothicPro', monospace";

const LANE = {
  LINE_WIDTH: 2,
  LINE_ALPHA: 0.7,
  LABEL_OFFSET_Y: 20,
  LABEL_FONT_SIZE: '22px',
} as const;

const NODE = {
  RADIUS: 14,
  BORDER_WIDTH: 4,
  GLOW_RADIUS: 24,
  GLOW_ALPHA: 0.2,
  BG_COLOR: 0x0d1117,
  TEXT_GAP: 10,
  TEXT_FONT_SIZE: '22px',
  TEXT_COLOR: '#e0e0ff',
  TEXT_BG_COLOR: '#000000cc',
  TEXT_MAX_WIDTH: 300,
  TEXT_BG_PADDING_X: 8,
  TEXT_BG_PADDING_Y: 6,
  START_Y: -80,
  END_OVERSHOOT: 60,
} as const;

/**
 * 기여도 뺏기 전용 브랜치 레인.
 * 싱글과 달리 처음부터 모두 visible이고, 아이템 없이 텍스트 노드만 사용.
 * 플레이어 위치는 React 오버레이(MultiPlayerCharacters)가 담당한다.
 */
export class ContributionLane extends Phaser.GameObjects.Container {
  private readonly laneWidth: number;
  private readonly canvasHeight: number;
  private readonly branchColor: { line: number; text: string };
  // 동시 다발 낙하 지원. 큐 head(index 0)가 가장 오래된(가장 아래) 노드.
  private commandNodes: Phaser.GameObjects.Container[] = [];
  private activeGlow: Phaser.GameObjects.Graphics | null = null;
  private flashGraphic: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, laneIndex: number, totalLanes: number, branchName: string) {
    const canvasHeight = scene.scale.height;
    const laneWidth = scene.scale.width / totalLanes;
    super(scene, laneIndex * laneWidth, 0);

    this.laneWidth = laneWidth;
    this.canvasHeight = canvasHeight;
    this.branchColor =
      BRANCH_COLORS[branchName.split('/')[0]] ??
      FALLBACK_COLORS[laneIndex % FALLBACK_COLORS.length] ??
      DEFAULT_COLOR;

    this.drawBranchLine();
    this.drawBranchLabel(branchName);
    scene.add.existing(this);
  }

  /** 명령어 노드를 위에서 아래로 낙하시켜 큐 끝에 추가한다 (다중 동시 낙하 지원). */
  showCommand(text: string, fallDuration: number, onTimeout: () => void): void {
    const node = this.buildNode(text);
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

  /** 큐의 가장 오래된 노드(가장 아래)를 성공 애니메이션과 함께 제거한다. */
  flashSuccess(): void {
    const node = this.commandNodes.shift();
    if (!node) return;
    (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();

    const ring = this.scene.add.graphics();
    ring.setPosition(this.laneWidth / 2, node.y);
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

  /** 가장 오래된 노드를 즉시 제거하고 레인 하단 빨간 플래시. COMMAND_EXPIRED 시 호출. */
  flashMiss(): void {
    this.removeOldest();
    if (this.flashGraphic) this.flashGraphic.destroy();
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

  /** 내 활성 브랜치 여부에 따라 배경 글로우를 표시/숨긴다. */
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

  /** 모든 명령어 노드와 트윈을 정리한다. 게임 종료 시 호출. */
  clearAll(): void {
    for (const node of this.commandNodes) {
      (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();
      node.destroy();
    }
    this.commandNodes = [];
  }

  private removeOldest(): void {
    const node = this.commandNodes.shift();
    if (!node) return;
    (node.getData('tween') as Phaser.Tweens.Tween | undefined)?.stop();
    node.destroy();
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
    g.fillStyle(color, NODE.GLOW_ALPHA);
    g.fillCircle(0, 0, NODE.GLOW_RADIUS);
    g.fillStyle(NODE.BG_COLOR, 1);
    g.fillCircle(0, 0, NODE.RADIUS);
    g.lineStyle(NODE.BORDER_WIDTH, color, 1);
    g.strokeCircle(0, 0, NODE.RADIUS);

    const textY = NODE.RADIUS + NODE.TEXT_GAP;
    const label = this.scene.add
      .text(0, textY, text, {
        fontSize: NODE.TEXT_FONT_SIZE,
        fontFamily: PIXEL_FONT,
        color: NODE.TEXT_COLOR,
        align: 'center',
        wordWrap: { width: NODE.TEXT_MAX_WIDTH },
        backgroundColor: NODE.TEXT_BG_COLOR,
        padding: { x: NODE.TEXT_BG_PADDING_X, y: NODE.TEXT_BG_PADDING_Y },
      })
      .setOrigin(0.5, 0);

    // 가장자리 레인에서 텍스트가 잘리지 않도록 x 보정
    const EDGE_PAD = 6;
    const worldX = this.x + this.laneWidth / 2;
    const cw = this.scene.scale.width;
    const hw = label.width / 2;
    if (worldX - hw < EDGE_PAD) label.setX(hw - worldX + EDGE_PAD);
    else if (worldX + hw > cw - EDGE_PAD) label.setX(cw - worldX - hw - EDGE_PAD);

    const node = this.scene.add.container(0, 0);
    node.add([g, label]);
    return node;
  }
}
