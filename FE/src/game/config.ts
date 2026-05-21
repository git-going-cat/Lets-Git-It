import Phaser from 'phaser';

/**
 * Phaser 게임 설정 factory.
 * parent는 호출처에서 spread로 추가하고,
 * scene은 인자로 직접 등록하거나 빈 배열 후 game.scene.add로 동적 주입한다.
 * RESIZE 모드로 캔버스가 부모 컨테이너를 꽉 채운다.
 */
export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[] = []
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}
