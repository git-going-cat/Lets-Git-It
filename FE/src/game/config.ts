import Phaser from 'phaser';

import { SingleScene } from '@/features/single/scenes/SingleScene';

// 설계 레퍼런스 1920×1080 기준: 중앙 패널 70% → 1344, 전체 높이 − 입력창(160px) → 952
// RESIZE 모드에서 실제 캔버스는 컨테이너 크기로 자동 조정되므로 이 값은 초기값만.
// (FE_CONVENTION 14장 "최소 지원 해상도 1280×720"은 지원 하한선이며 설계 레퍼런스와 무관)
export const GAME_WIDTH = 1344;
export const GAME_HEIGHT = 952;

/**
 * 싱글 모드 Phaser 게임 설정.
 * parent는 SinglePage에서 동적으로 지정한다.
 * RESIZE 모드로 캔버스가 부모 컨테이너를 꽉 채운다.
 */
export const singleGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [SingleScene],
};
