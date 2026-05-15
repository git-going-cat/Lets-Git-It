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

export type CharacterDirection = 'right' | 'back' | 'left' | 'front';

type DirectionFrameMap = Partial<Record<CharacterDirection, number>>;

interface AnimationConfig {
  y: number;
  frames: number;
  fps: number;
  directionStartFrames: DirectionFrameMap;
  fallbackDirection: CharacterDirection;
}

function rowY(row: number): number {
  return row * FRAME_H;
}

function directional(row: number, frames: number, fps: number): AnimationConfig {
  return {
    y: rowY(row),
    frames,
    fps,
    directionStartFrames: {
      right: 0,
      back: frames,
      left: frames * 2,
      front: frames * 3,
    },
    fallbackDirection: 'front',
  };
}

function frontOnly(row: number, frames: number, fps: number, startFrame = 0): AnimationConfig {
  return {
    y: rowY(row),
    frames,
    fps,
    directionStartFrames: { front: startFrame },
    fallbackDirection: 'front',
  };
}

function rightLeftOnly(row: number, frames: number, fps: number): AnimationConfig {
  return {
    y: rowY(row),
    frames,
    fps,
    directionStartFrames: { right: 0, left: frames },
    fallbackDirection: 'right',
  };
}

const ANIMATIONS = {
  idle: directional(1, 6, 4),
  walk: directional(2, 6, 8),
  sleep: frontOnly(3, 6, 4),
  sit1: rightLeftOnly(4, 6, 4),
  sit2: rightLeftOnly(5, 6, 4),
  phone: frontOnly(6, 12, 6),
  bookStand: frontOnly(7, 6, 6),
  bookRead: frontOnly(7, 6, 6, 6),
  pushCart: directional(8, 6, 8),
  pickUp: directional(9, 12, 8),
  gift: directional(10, 10, 6),
  lift: directional(11, 14, 8),
  throw: directional(12, 14, 8),
  hit: directional(13, 6, 8),
  punch: directional(14, 6, 8),
  stab: directional(15, 6, 10),
  grabGun: directional(16, 4, 6),
  gunIdle: directional(17, 6, 4),
  shoot: directional(18, 3, 8),
  hurt: directional(19, 3, 8),
} as const;

export type CharacterAnimation = keyof typeof ANIMATIONS;

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

function getSourceX(anim: AnimationConfig, direction: CharacterDirection, frame: number): number {
  const resolvedDirection =
    anim.directionStartFrames[direction] !== undefined ? direction : anim.fallbackDirection;
  const directionStartFrame = anim.directionStartFrames[resolvedDirection] ?? 0;

  return (directionStartFrame + frame) * FRAME_W;
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
        const srcX = getSourceX(anim, dirRef.current, frameRef.current);
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
