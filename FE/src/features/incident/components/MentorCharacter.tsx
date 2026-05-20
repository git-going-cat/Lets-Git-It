import { useEffect, useRef } from 'react';

/**
 * 유저에게 제공하지 않는 고번호 조합으로 고정된 멘토 캐릭터.
 * Body_03 · Eyes_06 · Hairstyle_28_04 · Outfit_30_02
 * CharacterPreview와 동일한 캔버스 레이어 합성 방식.
 */

const MENTOR_LAYERS = [
  '/Bodies/48x48/Body_48x48_03.png',
  '/Eyes/48x48/Eyes_48x48_06.png',
  '/Outfits/48x48/Outfit_30_48x48_02.png',
  '/Hairstyles/48x48/Hairstyle_28_48x48_04.png',
];

const FRAME_W = 48;
const FRAME_H = 96;
const CROP_TOP = 10;
const CROP_H = FRAME_H - CROP_TOP;
const SRC_X = 18 * FRAME_W; // idle, forward-facing
const SRC_Y = 1 * FRAME_H; // row 1 = idle animation row

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function MentorCharacter({ className = 'w-24' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let cancelled = false;

    async function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, FRAME_W, CROP_H);
      for (const src of MENTOR_LAYERS) {
        if (cancelled) return;
        const img = await loadImage(src);
        if (img && !cancelled) {
          ctx.drawImage(img, SRC_X, SRC_Y + CROP_TOP, FRAME_W, CROP_H, 0, 0, FRAME_W, CROP_H);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_W}
      height={CROP_H}
      className={`${className} [image-rendering:pixelated]`}
    />
  );
}
