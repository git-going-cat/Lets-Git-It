import Phaser from 'phaser';

import { coopBus } from '../bridge/coopBus';

type CardSlot = {
  cover: Phaser.GameObjects.Rectangle;
  order: number;
  x: number;
  y: number;
};

/**
 * 협력 모드의 Phaser 렌더링 레이어입니다.
 * 배경, 명령어 카드 placeholder, 야바위 손 tween만 담당하고 React 상태는 coopBus로만 통신합니다.
 */
export class CoopScene extends Phaser.Scene {
  private cards: CardSlot[] = [];

  private hands: Phaser.GameObjects.Rectangle[] = [];

  private clouds: Phaser.GameObjects.Graphics[] = [];

  private isShuffling = false;

  private pendingRevealOrder: number | null = null;

  constructor() {
    super({ key: 'CoopScene' });
  }

  create() {
    this.renderScene();
    this.scale.on('resize', this.handleResize);
    coopBus.on('coop:reveal-ended', this.handleRevealEnded);
    coopBus.on('coop:assign-start', this.handleRevealEnded);
    coopBus.on('coop:assign-reveal', this.handleAssignReveal);
    coopBus.on('coop:screen-shake', this.handleScreenShake);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
  }

  private shutdown = () => {
    this.scale.off('resize', this.handleResize);
    coopBus.off('coop:reveal-ended', this.handleRevealEnded);
    coopBus.off('coop:assign-start', this.handleRevealEnded);
    coopBus.off('coop:assign-reveal', this.handleAssignReveal);
    coopBus.off('coop:screen-shake', this.handleScreenShake);
    this.tweens.killAll();
  };

  private handleResize = () => {
    this.renderScene();
  };

  private renderScene() {
    this.children.removeAll();
    this.cards = [];
    this.hands = [];
    this.clouds = [];

    const width = this.scale.width;
    const height = this.scale.height;

    this.renderBackground(width, height);
    this.renderCommandCards(width, height);
    this.renderHands(width, height);
  }

  private renderBackground(width: number, height: number) {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb0e2ff, 0xb0e2ff, 1);
    sky.fillRect(0, 0, width, height);

    this.drawCloud(width * 0.18, height * 0.22, 0xf5fbff, 0.48, 0);
    this.drawCloud(width * 0.72, height * 0.32, 0xfff4f7, 0.56, 1);
    this.drawCloud(width * 0.3, height * 0.76, 0xffcbd8, 0.64, 2);
    this.drawCloud(width * 0.68, height * 0.82, 0xffdec2, 0.58, 3);
  }

  private drawCloud(x: number, y: number, color: number, alpha: number, index: number) {
    const cloud = this.add.graphics();
    cloud.fillStyle(color, alpha);
    cloud.fillCircle(0, 0, 46);
    cloud.fillCircle(44, -12, 58);
    cloud.fillCircle(96, 2, 44);
    cloud.fillRoundedRect(-24, 0, 150, 50, 18);
    cloud.setPosition(x, y);
    this.clouds.push(cloud);

    this.tweens.add({
      targets: cloud,
      x: x + (index % 2 === 0 ? 18 : -18),
      duration: 5200 + index * 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private renderCommandCards(width: number, height: number) {
    const cardWidth = Math.max(120, Math.min(170, width * 0.16));
    const cardHeight = Math.max(88, Math.min(112, height * 0.16));
    const gap = Math.max(18, width * 0.025);
    const totalWidth = cardWidth * 4 + gap * 3;
    const startX = width / 2 - totalWidth / 2 + cardWidth / 2;
    const y = height * 0.52;

    for (let i = 0; i < 4; i += 1) {
      const x = startX + i * (cardWidth + gap);
      const card = this.add.rectangle(x, y, cardWidth, cardHeight, 0x0d1117, 0.82);
      card.setStrokeStyle(3, 0x76bf41, 0.9);

      this.add
        .text(x, y - 10, `#${i + 1}`, {
          color: '#f2cb05',
          fontFamily: 'monospace',
          fontSize: '20px',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 18, 'COMMAND', {
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '14px',
        })
        .setOrigin(0.5);

      const cover = this.add.rectangle(x, y, cardWidth + 10, cardHeight + 10, 0x111827, 0.92);
      cover.setStrokeStyle(2, 0x05aff2, 0.9);
      cover.setVisible(false);

      this.cards.push({ cover, order: i + 1, x, y });
    }
  }

  private renderHands(width: number, height: number) {
    const handWidth = Math.max(260, width * 0.28);
    const handHeight = Math.max(90, height * 0.13);
    const y = -handHeight;
    const leftHand = this.add.rectangle(width * 0.38, y, handWidth, handHeight, 0xfff0d5, 0.92);
    const rightHand = this.add.rectangle(width * 0.62, y, handWidth, handHeight, 0xfff0d5, 0.92);

    leftHand.setStrokeStyle(4, 0x8b5e3c, 0.8);
    rightHand.setStrokeStyle(4, 0x8b5e3c, 0.8);
    leftHand.setVisible(false);
    rightHand.setVisible(false);

    this.hands = [leftHand, rightHand];
  }

  private handleRevealEnded = () => {
    if (this.isShuffling) return;
    this.startShuffle();
  };

  private startShuffle() {
    this.isShuffling = true;
    this.pendingRevealOrder = null;
    this.cards.forEach((card) => card.cover.setVisible(true));
    this.hands.forEach((hand) => {
      hand.setVisible(true);
      hand.setY(-hand.height);
    });

    const targetY = this.scale.height * 0.42;
    this.tweens.add({
      targets: this.hands,
      y: targetY,
      duration: 520,
      ease: 'Back.easeOut',
      onComplete: () => this.runShuffleSteps(0, 10),
    });
  }

  private runShuffleSteps(step: number, totalSteps: number) {
    if (step >= totalSteps) {
      this.time.delayedCall(400, () => {
        this.isShuffling = false;
        if (this.pendingRevealOrder !== null) {
          this.revealAssignedCard(this.pendingRevealOrder);
          this.pendingRevealOrder = null;
        }
      });
      return;
    }

    const distance = step % 2 === 0 ? 34 : -34;
    const duration = Math.max(70, 220 - step * 14);

    this.tweens.add({
      targets: this.hands,
      x: `+=${distance}`,
      duration,
      yoyo: true,
      ease: 'Sine.easeIn',
      onComplete: () => this.runShuffleSteps(step + 1, totalSteps),
    });
  }

  private handleAssignReveal = ({ myCommandOrder }: { myCommandOrder: number }) => {
    if (this.isShuffling) {
      this.pendingRevealOrder = myCommandOrder;
      return;
    }
    this.revealAssignedCard(myCommandOrder);
  };

  private revealAssignedCard(myCommandOrder: number) {
    const card = this.cards.find((slot) => slot.order === myCommandOrder);
    if (!card) {
      coopBus.emit('coop:assign-complete');
      return;
    }

    card.cover.setVisible(false);
    const targetHand = myCommandOrder <= 2 ? this.hands[0] : this.hands[1];

    this.tweens.add({
      targets: targetHand,
      y: -targetHand.height,
      duration: 460,
      ease: 'Back.easeIn',
      onComplete: () => coopBus.emit('coop:assign-complete'),
    });
  }

  private handleScreenShake = () => {
    this.cameras.main.shake(450, 0.01);
  };
}
