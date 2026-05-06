import { useEffect, useRef } from 'react';

import { buildCharacterPaths, loadImage } from '../utils/characterAssets';

import type { CharacterFormValues } from '../schemas/onboarding.schema';

interface Props {
  values: CharacterFormValues;
}

/**
 * 현재 선택된 파츠를 캔버스에 레이어 합성하여 미리보기를 렌더링합니다.
 *
 * 스프라이트 시트 구조 (48×48 단위):
 *   - y=0:  Row 0 — 정면 기본 자세 (2프레임, 미리보기에 사용)
 *   - y=48: Row 1 — idle 애니메이션
 *   - y=96: Row 2 — walk 애니메이션
 * 렌더 순서: body → eyes → outfit → hair
 */
export default function CharacterPreview({ values }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const paths = buildCharacterPaths(values);
    const layerPaths = [paths.body, paths.eyes, paths.outfit, paths.hair];

    // 스프라이트 프레임 크기: 48×96
    const FRAME_W = 48;
    const FRAME_H = 96;

    // Idle 애니메이션: row 1 (y=96)
    // 정면 방향: right*6 + back*6 + left*6 = 18 프레임 건너뜀 → srcX = 18 * 48 = 864
    const srcX = 18 * FRAME_W; // 864
    const srcY = 1 * FRAME_H; // 96

    let cancelled = false;

    async function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      for (const src of layerPaths) {
        if (cancelled) return;
        const img = await loadImage(src);
        if (img && !cancelled) {
          ctx.drawImage(img, srcX, srcY, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [values]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={96}
      className="w-36 h-72 [image-rendering:pixelated]"
    />
  );
}
