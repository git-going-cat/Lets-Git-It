import Phaser from 'phaser';

import { coopBus } from '../bridge/coopBus';

const CARD_WIDTH = 112;
const CARD_HEIGHT = 176;
const CARD_GAP = 130;
const CARD_START_OFFSET = 195;
const SHUFFLE_DURATIONS = [300, 280, 250, 220, 180, 150, 120, 100, 80, 70];

export class CoopScene extends Phaser.Scene {
  private handLeft: Phaser.GameObjects.Rectangle | null = null;

  private handRight: Phaser.GameObjects.Rectangle | null = null;

  private cards: Phaser.GameObjects.Image[] = [];

  private readonly cardBackKeys = ['card_back_1', 'card_back_2', 'card_back_3', 'card_back_4'];

  private cardOrder = [0, 1, 2, 3];

  private isShuffling = false;

  private pendingAssignReveal = false;

  private myCardPhysicalIndex: number | null = null;

  constructor() {
    super({ key: 'CoopScene' });
  }

  preload() {
    this.load.image('card_front', '/assets/coop/coop_card_front.png');
    this.load.image('card_back_1', '/assets/coop/coop_card_back_01.png');
    this.load.image('card_back_2', '/assets/coop/coop_card_back_02.png');
    this.load.image('card_back_3', '/assets/coop/coop_card_back_03.png');
    this.load.image('card_back_4', '/assets/coop/coop_card_back_04.png');
  }

  create() {
    this.renderScene();
    this.scale.on('resize', this.handleResize);
    coopBus.on('coop:reveal-ended', this.startShuffleTween);
    coopBus.on('coop:assign-reveal', this.handleAssignReveal);
    coopBus.on('coop:cards-hide', this.handleCardsHide);
    coopBus.on('coop:screen-shake', this.handleScreenShake);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
  }

  private shutdown = () => {
    this.scale.off('resize', this.handleResize);
    coopBus.off('coop:reveal-ended', this.startShuffleTween);
    coopBus.off('coop:assign-reveal', this.handleAssignReveal);
    coopBus.off('coop:cards-hide', this.handleCardsHide);
    coopBus.off('coop:screen-shake', this.handleScreenShake);
    this.tweens.killAll();
  };

  private handleResize = () => {
    this.renderScene();
  };

  private renderScene() {
    this.children.removeAll();
    this.cards = [];
    this.cardOrder = [0, 1, 2, 3];
    this.handLeft = null;
    this.handRight = null;

    const width = this.scale.width;
    const height = this.scale.height;

    this.renderCards(width, height);
    this.renderHands(width);
  }

  private renderCards(width: number, height: number) {
    const centerX = width / 2;
    const cardY = height * 0.42;
    const startX = centerX - CARD_START_OFFSET;

    this.cards = [0, 1, 2, 3].map((index) =>
      this.add
        .image(startX + index * CARD_GAP, cardY, 'card_front')
        .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        .setVisible(false)
    );
  }

  private renderHands(width: number) {
    const centerX = width / 2;
    this.handLeft = this.add.rectangle(centerX - 150, -100, 60, 80, 0x333333, 0.86);
    this.handRight = this.add.rectangle(centerX + 150, -100, 60, 80, 0x333333, 0.86);

    this.handLeft.setStrokeStyle(3, 0x05aff2, 0.9).setVisible(false);
    this.handRight.setStrokeStyle(3, 0x05aff2, 0.9).setVisible(false);
  }

  private startShuffleTween = () => {
    if (this.isShuffling || !this.handLeft || !this.handRight || this.cards.length === 0) return;
    this.isShuffling = true;
    this.pendingAssignReveal = false;
    this.myCardPhysicalIndex = null;
    this.cardOrder = [0, 1, 2, 3];

    const centerX = this.scale.width / 2;
    const cardY = this.scale.height * 0.42;
    const startX = centerX - CARD_START_OFFSET;

    this.cards.forEach((card, index) => {
      card
        .setTexture(this.cardBackKeys[index % this.cardBackKeys.length])
        .setPosition(startX + index * CARD_GAP, cardY)
        .setDisplaySize(CARD_WIDTH, CARD_HEIGHT)
        .setVisible(true);
    });

    this.handLeft.setVisible(true).setPosition(centerX - 150, -100);
    this.handRight.setVisible(true).setPosition(centerX + 150, -100);

    this.tweens.add({
      targets: [this.handLeft, this.handRight],
      y: cardY,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => this.startCardSwapLoop(),
    });
  };

  private startCardSwapLoop() {
    let swapCount = 0;

    const doSwap = () => {
      if (swapCount >= SHUFFLE_DURATIONS.length) {
        this.time.delayedCall(400, () => {
          this.isShuffling = false;
          if (this.pendingAssignReveal) {
            this.pendingAssignReveal = false;
            this.liftHands();
            return;
          }

          coopBus.emit('coop:shuffle-complete');
        });
        return;
      }

      const idxA = Phaser.Math.Between(0, this.cards.length - 1);
      let idxB = Phaser.Math.Between(0, this.cards.length - 1);
      while (idxB === idxA) {
        idxB = Phaser.Math.Between(0, this.cards.length - 1);
      }

      const cardA = this.cards[idxA];
      const cardB = this.cards[idxB];
      const xA = cardA.x;
      const xB = cardB.x;
      const duration = SHUFFLE_DURATIONS[swapCount] ?? 70;

      this.tweens.add({
        targets: cardA,
        x: xB,
        duration,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: cardB,
        x: xA,
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          [this.cards[idxA], this.cards[idxB]] = [this.cards[idxB], this.cards[idxA]];
          [this.cardOrder[idxA], this.cardOrder[idxB]] = [
            this.cardOrder[idxB],
            this.cardOrder[idxA],
          ];
          swapCount += 1;
          doSwap();
        },
      });
    };

    doSwap();
  }

  private handleAssignReveal = (payload: { myCommandOrder: number }) => {
    const originalIndex = payload.myCommandOrder - 1;
    const physicalIndex = this.cardOrder.indexOf(originalIndex);
    this.myCardPhysicalIndex = physicalIndex >= 0 ? physicalIndex : originalIndex;

    if (this.isShuffling) {
      this.pendingAssignReveal = true;
      return;
    }

    this.liftHands();
  };

  private liftHands = () => {
    if (!this.handLeft || !this.handRight) return;

    if (this.myCardPhysicalIndex !== null) {
      this.cards[this.myCardPhysicalIndex]?.setTexture('card_front');
    }

    this.tweens.add({
      targets: [this.handLeft, this.handRight],
      y: -100,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.handLeft?.setVisible(false);
        this.handRight?.setVisible(false);
        coopBus.emit('coop:shuffle-complete');
      },
    });
  };

  private handleCardsHide = () => {
    this.cards.forEach((card) => card.setVisible(false));
    this.myCardPhysicalIndex = null;
    this.pendingAssignReveal = false;
    this.isShuffling = false;
  };

  private handleScreenShake = () => {
    this.cameras.main.shake(450, 0.01);
  };
}
