import { useCallback, useEffect, useRef, useState } from 'react';

import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import type { CharacterAnimation, CharacterDirection } from '@/shared/components/AnimatedCharacter';

const CHARACTER_WIDTH_PX = 48;
const CHARACTER_HEIGHT_PX = 96;
const EDGE_PADDING_PX = 8;
const TOP_SAFE_PX = 72;
const BOTTOM_SAFE_PX = 64;
const MIN_MOVE_DISTANCE_PX = 220;
const MS_PER_PX = 12;
const MIN_MOVE_MS = 700;
const MAX_MOVE_MS = 5000;
const MIN_IDLE_MS = 1000;
const MAX_IDLE_MS = 2000;
const SPECIAL_ANIMATION_MS = {
  sleep: 1500,
  sit1: 1500,
  sit2: 1500,
  phone: 2000,
  bookStand: 1200,
  bookRead: 1200,
  pushCart: 1200,
  pickUp: 1500,
  gift: 1667,
  lift: 1750,
  throw: 1750,
  hit: 1200,
  punch: 1200,
  stab: 1200,
  grabGun: 1200,
  gunIdle: 1500,
  shoot: 1200,
  hurt: 1200,
} as const;

type SpecialAnimation = keyof typeof SPECIAL_ANIMATION_MS;
const SPECIAL_ANIMATIONS = Object.keys(SPECIAL_ANIMATION_MS) as SpecialAnimation[];

interface CharacterMotionState {
  animation: CharacterAnimation;
  direction: CharacterDirection;
  durationMs: number;
  initialized: boolean;
  x: number;
  y: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.hypot(toX - fromX, toY - fromY);
}

function getMovementBounds(containerWidth: number, containerHeight: number) {
  const maxX = Math.max(0, containerWidth - CHARACTER_WIDTH_PX - EDGE_PADDING_PX);
  const minX = Math.min(EDGE_PADDING_PX, maxX);
  const maxY = Math.max(0, containerHeight - CHARACTER_HEIGHT_PX - BOTTOM_SAFE_PX);
  const minY = Math.min(TOP_SAFE_PX, maxY);

  return { maxX, maxY, minX, minY };
}

function getRandomPosition(containerWidth: number, containerHeight: number, current?: Position) {
  const { maxX, maxY, minX, minY } = getMovementBounds(containerWidth, containerHeight);

  if (maxX <= minX && maxY <= minY) return { x: 0, y: 0 };

  const range = maxX - minX;
  const minDistance = Math.min(MIN_MOVE_DISTANCE_PX, Math.max(range, maxY - minY) * 0.5);
  const minXDistance = Math.min(120, range * 0.4);
  let next = { x: randomBetween(minX, maxX), y: randomBetween(minY, maxY) };

  for (let i = 0; i < 12; i++) {
    if (
      !current ||
      (getDistance(current.x, current.y, next.x, next.y) >= minDistance &&
        Math.abs(next.x - current.x) >= minXDistance)
    ) {
      return next;
    }
    next = { x: randomBetween(minX, maxX), y: randomBetween(minY, maxY) };
  }

  if (!current) return next;

  return {
    x: current.x < (minX + maxX) / 2 ? maxX : minX,
    y: current.y < (minY + maxY) / 2 ? maxY : minY,
  };
}

function getMoveDuration(distance: number): number {
  return Math.round(clamp(distance * MS_PER_PX, MIN_MOVE_MS, MAX_MOVE_MS));
}

function isSpecialAnimation(animation: CharacterAnimation): animation is SpecialAnimation {
  return animation in SPECIAL_ANIMATION_MS;
}

function getRandomSpecialAnimation(): SpecialAnimation {
  return SPECIAL_ANIMATIONS[Math.floor(Math.random() * SPECIAL_ANIMATIONS.length)];
}

interface Position {
  x: number;
  y: number;
}

interface ActiveMove {
  target: Position;
}

function getWalkDirection(fromX: number, toX: number): CharacterDirection {
  return toX >= fromX ? 'right' : 'left';
}

function getSpecialDirection(
  animation: SpecialAnimation,
  previousDirection: CharacterDirection
): CharacterDirection {
  if (animation === 'sit1' || animation === 'sit2' || animation === 'pushCart') {
    return previousDirection === 'left' ? 'left' : 'right';
  }

  return 'front';
}

export default function HomeWalkingCharacter() {
  const { data: asset } = useCurrentCharacterAsset();
  const areaRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLButtonElement>(null);
  const moveTimeoutRef = useRef<number | null>(null);
  const specialTimeoutRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const activeMoveRef = useRef<ActiveMove | null>(null);
  const animationRef = useRef<CharacterAnimation>('idle');
  const [motion, setMotion] = useState<CharacterMotionState>({
    animation: 'idle',
    direction: 'front',
    durationMs: 0,
    initialized: false,
    x: 0,
    y: 0,
  });

  const clearMoveTimeout = useCallback(() => {
    if (moveTimeoutRef.current !== null) {
      window.clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
  }, []);

  const clearSpecialTimeout = useCallback(() => {
    if (specialTimeoutRef.current !== null) {
      window.clearTimeout(specialTimeoutRef.current);
      specialTimeoutRef.current = null;
    }
  }, []);

  const setAnimation = useCallback((animation: CharacterAnimation) => {
    animationRef.current = animation;
  }, []);

  const scheduleMoveAfterIdle = useCallback(
    (startMove: () => void) => {
      clearMoveTimeout();
      const idleMs = Math.round(randomBetween(MIN_IDLE_MS, MAX_IDLE_MS));
      moveTimeoutRef.current = window.setTimeout(startMove, idleMs);
    },
    [clearMoveTimeout]
  );

  const finishMove = useCallback(
    (startMove: () => void) => {
      activeMoveRef.current = null;
      setAnimation('idle');
      setMotion((prev) => ({
        ...prev,
        animation: 'idle',
        direction: 'front',
        durationMs: 0,
      }));
      scheduleMoveAfterIdle(startMove);
    },
    [scheduleMoveAfterIdle, setAnimation]
  );

  const startMove = useCallback(
    function startMove(targetPosition?: Position) {
      if (isSpecialAnimation(animationRef.current)) return;

      const fromX = currentXRef.current;
      const fromY = currentYRef.current;
      const width = areaRef.current?.clientWidth ?? window.innerWidth;
      const height = areaRef.current?.clientHeight ?? window.innerHeight;
      const target = targetPosition ?? getRandomPosition(width, height, { x: fromX, y: fromY });
      const distance = getDistance(fromX, fromY, target.x, target.y);

      if (distance < 1) {
        scheduleMoveAfterIdle(() => startMove());
        return;
      }

      const durationMs = getMoveDuration(distance);
      currentXRef.current = target.x;
      currentYRef.current = target.y;
      activeMoveRef.current = { target };
      setAnimation('walk');
      setMotion({
        animation: 'walk',
        direction: getWalkDirection(fromX, target.x),
        durationMs,
        initialized: true,
        x: target.x,
        y: target.y,
      });

      clearMoveTimeout();
      moveTimeoutRef.current = window.setTimeout(() => finishMove(() => startMove()), durationMs);
    },
    [clearMoveTimeout, finishMove, scheduleMoveAfterIdle, setAnimation]
  );

  const getRenderedPosition = useCallback(() => {
    const areaRect = areaRef.current?.getBoundingClientRect();
    const characterRect = characterRef.current?.getBoundingClientRect();
    if (!areaRect || !characterRect) return { x: currentXRef.current, y: currentYRef.current };

    return {
      x: characterRect.left - areaRect.left,
      y: characterRect.top - areaRect.top,
    };
  }, []);

  const handleCharacterClick = () => {
    if (isSpecialAnimation(animationRef.current)) return;

    const previousAnimation = animationRef.current;
    const previousDirection = motion.direction;
    const previousMove = activeMoveRef.current;
    const pausedPosition = getRenderedPosition();
    const specialAnimation = getRandomSpecialAnimation();

    clearMoveTimeout();
    clearSpecialTimeout();

    currentXRef.current = pausedPosition.x;
    currentYRef.current = pausedPosition.y;
    activeMoveRef.current = null;
    setAnimation(specialAnimation);
    setMotion((prev) => ({
      ...prev,
      animation: specialAnimation,
      direction: getSpecialDirection(specialAnimation, previousDirection),
      durationMs: 0,
      x: pausedPosition.x,
      y: pausedPosition.y,
    }));

    specialTimeoutRef.current = window.setTimeout(() => {
      specialTimeoutRef.current = null;

      if (previousAnimation === 'walk' && previousMove) {
        setAnimation('idle');
        startMove(previousMove.target);
        return;
      }

      setAnimation('idle');
      setMotion((prev) => ({
        ...prev,
        animation: 'idle',
        direction: 'front',
        durationMs: 0,
      }));
      scheduleMoveAfterIdle(() => startMove());
    }, SPECIAL_ANIMATION_MS[specialAnimation]);
  };

  useEffect(() => {
    if (!asset) return;

    const width = areaRef.current?.clientWidth ?? window.innerWidth;
    const height = areaRef.current?.clientHeight ?? window.innerHeight;
    const initialPosition = getRandomPosition(width, height);
    currentXRef.current = initialPosition.x;
    currentYRef.current = initialPosition.y;
    activeMoveRef.current = null;
    setAnimation('idle');
    setMotion({
      animation: 'idle',
      direction: 'front',
      durationMs: 0,
      initialized: true,
      x: initialPosition.x,
      y: initialPosition.y,
    });
    scheduleMoveAfterIdle(() => startMove());

    const handleResize = () => {
      const renderedPosition = getRenderedPosition();
      const nextWidth = areaRef.current?.clientWidth ?? window.innerWidth;
      const nextHeight = areaRef.current?.clientHeight ?? window.innerHeight;
      const { maxX, maxY, minX, minY } = getMovementBounds(nextWidth, nextHeight);
      const nextX = clamp(renderedPosition.x, minX, maxX);
      const nextY = clamp(renderedPosition.y, minY, maxY);

      clearMoveTimeout();
      currentXRef.current = nextX;
      currentYRef.current = nextY;
      activeMoveRef.current = null;
      setAnimation('idle');
      setMotion((prev) => ({
        ...prev,
        animation: 'idle',
        direction: 'front',
        durationMs: 0,
        x: nextX,
        y: nextY,
      }));
      scheduleMoveAfterIdle(() => startMove());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearMoveTimeout();
      clearSpecialTimeout();
      window.removeEventListener('resize', handleResize);
    };
  }, [
    asset,
    clearMoveTimeout,
    clearSpecialTimeout,
    getRenderedPosition,
    scheduleMoveAfterIdle,
    setAnimation,
    startMove,
  ]);

  if (!asset) return null;

  return (
    <div ref={areaRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <button
        ref={characterRef}
        type="button"
        className="pointer-events-auto absolute left-0 top-0 border-0 bg-transparent p-0 outline-none! focus:outline-none! focus-visible:outline-none!"
        onClick={handleCharacterClick}
        aria-label="Play character animation"
        style={{
          transform: `translate(${motion.x}px, ${motion.y}px)`,
          transition: motion.durationMs > 0 ? `transform ${motion.durationMs}ms linear` : 'none',
          visibility: motion.initialized ? 'visible' : 'hidden',
        }}
      >
        <AnimatedCharacter
          key={`${motion.animation}-${motion.direction}`}
          asset={asset}
          animation={motion.animation}
          direction={motion.direction}
          className="h-24 w-12 drop-shadow-lg"
        />
      </button>
    </div>
  );
}
