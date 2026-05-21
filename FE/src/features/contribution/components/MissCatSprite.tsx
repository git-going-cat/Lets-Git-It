import catSheet from '@/assets/game/cat.png';

const CAT_FRAME_W = 128;
const CAT_FRAME_H = 80;
const CAT_FRAME_COUNT = 4;

interface MissCatSpriteProps {
  /** 표시 높이(px). 너비는 sprite 비율로 자동 계산. */
  height: number;
}

/**
 * miss 누적분을 표시하는 정적 고양이 스프라이트 (frame 0 / idle).
 * cat.png는 4-frame sprite sheet라 background-position으로 첫 프레임만 노출.
 */
export default function MissCatSprite({ height }: MissCatSpriteProps) {
  const width = Math.round((height * CAT_FRAME_W) / CAT_FRAME_H);
  return (
    <div
      className="pixel-art bg-no-repeat"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundImage: `url(${catSheet})`,
        backgroundSize: `${CAT_FRAME_COUNT * width}px ${height}px`,
        backgroundPosition: '0 0',
      }}
      aria-hidden="true"
    />
  );
}
