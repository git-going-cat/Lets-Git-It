import Phaser from 'phaser';

import { coopBus } from '../bridge/coopBus';

export class CoopScene extends Phaser.Scene {
  private isSceneDestroyed = false;
  private unsubscribeBusEvents: Array<() => void> = [];

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
    this.isSceneDestroyed = false;
    this.unsubscribeBusEvents = [
      coopBus.subscribe('coop:reveal-ended', this.showAssignCards),
      coopBus.subscribe('coop:assign-reveal', this.handleAssignReveal),
      coopBus.subscribe('coop:cards-hide', this.handleCardsHide),
      coopBus.subscribe('coop:screen-shake', this.handleScreenShake),
    ];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
    coopBus.emit('coop:scene-ready');
  }

  private shutdown = () => {
    if (this.isSceneDestroyed) return;
    this.isSceneDestroyed = true;
    this.unsubscribeBusEvents.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeBusEvents = [];
    this.tweens.killAll();
  };

  private isSceneReady() {
    return (
      !this.isSceneDestroyed &&
      this.sys !== undefined &&
      this.sys.displayList !== null &&
      this.scale !== undefined
    );
  }

  private showAssignCards = () => {
    if (!this.isSceneReady()) return;
  };

  private handleAssignReveal = () => {
    if (!this.isSceneReady()) return;
  };

  private handleCardsHide = () => {
    if (!this.isSceneReady()) return;
  };

  private handleScreenShake = () => {
    if (!this.isSceneReady()) return;
    if (!this.cameras?.main) return;
    this.cameras.main.shake(450, 0.01);
  };
}
