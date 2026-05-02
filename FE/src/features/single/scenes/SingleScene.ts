import Phaser from 'phaser';

/**
 * 싱글 모드 메인 게임 씬.
 * Git 브랜치와 명령어 오브젝트를 렌더링한다.
 */
export class SingleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SingleScene' });
  }

  create(): void {
    // TODO(127): EventBus 이벤트 등록
  }

  shutdown(): void {
    // TODO(127): EventBus 이벤트 해제
  }
}
