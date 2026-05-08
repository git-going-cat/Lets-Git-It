import { useEffect, useRef } from 'react';

export interface CharacterAsset {
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
}

const FRAME_W = 48;
const FRAME_H = 96;

// dirFrames: 방향당 프레임 수 (idle/walk/pushCart=6, lift=14)
const ANIMATIONS = {
  idle: { y: 96, frames: 6, dirFrames: 6, fps: 4 },
  walk: { y: 192, frames: 6, dirFrames: 6, fps: 8 },
  pushCart: { y: 768, frames: 6, dirFrames: 6, fps: 8 },
  lift: { y: 1056, frames: 14, dirFrames: 14, fps: 6 },
} as const;

// 방향 인덱스: srcX = (DIR_INDEX[dir] * dirFrames + frame) * FRAME_W
const DIR_INDEX = { right: 0, back: 1, left: 2, front: 3 } as const;

export type CharacterAnimation = keyof typeof ANIMATIONS;
export type CharacterDirection = keyof typeof DIR_INDEX;

function buildLayerPaths(asset: CharacterAsset): string[] {
  const bodyNum = asset.characterBody.replace('Body_', '');
  const eyeNum = asset.characterEye.replace('Eyes_', '');
  const hairStyle = asset.characterHair.replace('Hairstyle_', '');
  const hairColor = asset.characterHairColor.replace('Hairstyle-color_', '');
  const outfitStyle = asset.characterOutfit.replace('Outfit_', '');
  const outfitColor = asset.characterOutfitColor.replace('Outfit-color_', '');
  return [
    `/Bodies/48x48/Body_48x48_${bodyNum}.png`,
    `/Eyes/48x48/Eyes_48x48_${eyeNum}.png`,
    `/Outfits/48x48/Outfit_${outfitStyle}_48x48_${outfitColor}.png`,
    `/Hairstyles/48x48/Hairstyle_${hairStyle}_48x48_${hairColor}.png`,
  ];
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
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

interface AnimatedCharacterProps {
  asset: CharacterAsset;
  animation?: CharacterAnimation;
  direction?: CharacterDirection;
  className?: string;
}

export default function AnimatedCharacter({
  asset,
  animation = 'idle',
  direction = 'front',
  className,
}: AnimatedCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef(animation);
  const dirRef = useRef(direction);

  useEffect(() => {
    animRef.current = animation;
    dirRef.current = direction;
    frameRef.current = 0;
  }, [animation, direction]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(buildLayerPaths(asset).map(loadImage)).then((imgs) => {
      if (!cancelled) imagesRef.current = imgs;
    });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const loop = (timestamp: number) => {
      const anim = ANIMATIONS[animRef.current];
      if (timestamp - lastTimeRef.current >= 1000 / anim.fps) {
        lastTimeRef.current = timestamp;
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        const srcX = (DIR_INDEX[dirRef.current] * anim.dirFrames + frameRef.current) * FRAME_W;
        for (const img of imagesRef.current) {
          if (img) ctx.drawImage(img, srcX, anim.y, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
        }
        frameRef.current = (frameRef.current + 1) % anim.frames;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_W}
      height={FRAME_H}
      className={`pixel-art ${className ?? ''}`}
    />
  );
}
