import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clampPosition,
  getDistance,
  getMoveDuration,
  getRandomPosition,
  getRandomSpecialAnimation,
  getSpecialDirection,
  getWalkDirection,
  isSpecialAnimation,
  MAX_IDLE_MS,
  MIN_IDLE_MS,
  SPECIAL_ANIMATION_MS,
} from '../utils/walkingAnimation';

import type { Position } from '../utils/walkingAnimation';
import type { CharacterAnimation, CharacterDirection } from '@/shared/components/AnimatedCharacter';

interface CharacterMotionState {
  animation: CharacterAnimation;
  direction: CharacterDirection;
  durationMs: number;
  initialized: boolean;
  x: number;
  y: number;
}

interface ActiveMove {
  target: Position;
}

interface UseHomeWalkingMotionParams {
  enabled: boolean;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 홈 화면 캐릭터의 이동, 리사이즈 보정, 클릭 특수 애니메이션 타이머를 관리합니다.
 */
export function useHomeWalkingMotion({ enabled }: UseHomeWalkingMotionParams) {
  const areaRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLButtonElement>(null);
  const moveTimeoutRef = useRef<number | null>(null);
  const specialTimeoutRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const activeMoveRef = useRef<ActiveMove | null>(null);
  const animationRef = useRef<CharacterAnimation>('idle');
  const startMoveRef = useRef<(targetPosition?: Position) => void>(() => {});
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
    (targetPosition?: Position) => {
      if (isSpecialAnimation(animationRef.current)) return;

      const fromX = currentXRef.current;
      const fromY = currentYRef.current;
      const width = areaRef.current?.clientWidth ?? window.innerWidth;
      const height = areaRef.current?.clientHeight ?? window.innerHeight;
      const target = targetPosition ?? getRandomPosition(width, height, { x: fromX, y: fromY });
      const distance = getDistance(fromX, fromY, target.x, target.y);

      if (distance < 1) {
        scheduleMoveAfterIdle(() => startMoveRef.current());
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
      moveTimeoutRef.current = window.setTimeout(
        () => finishMove(() => startMoveRef.current()),
        durationMs
      );
    },
    [clearMoveTimeout, finishMove, scheduleMoveAfterIdle, setAnimation]
  );

  useEffect(() => {
    startMoveRef.current = startMove;
  }, [startMove]);

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
        startMoveRef.current(previousMove.target);
        return;
      }

      setAnimation('idle');
      setMotion((prev) => ({
        ...prev,
        animation: 'idle',
        direction: 'front',
        durationMs: 0,
      }));
      scheduleMoveAfterIdle(() => startMoveRef.current());
    }, SPECIAL_ANIMATION_MS[specialAnimation]);
  };

  useEffect(() => {
    if (!enabled) return;

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
    scheduleMoveAfterIdle(() => startMoveRef.current());

    const handleResize = () => {
      const renderedPosition = getRenderedPosition();
      const nextWidth = areaRef.current?.clientWidth ?? window.innerWidth;
      const nextHeight = areaRef.current?.clientHeight ?? window.innerHeight;
      const nextPosition = clampPosition(renderedPosition, nextWidth, nextHeight);

      clearMoveTimeout();
      clearSpecialTimeout();
      currentXRef.current = nextPosition.x;
      currentYRef.current = nextPosition.y;
      activeMoveRef.current = null;
      setAnimation('idle');
      setMotion((prev) => ({
        ...prev,
        animation: 'idle',
        direction: 'front',
        durationMs: 0,
        x: nextPosition.x,
        y: nextPosition.y,
      }));
      scheduleMoveAfterIdle(() => startMoveRef.current());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearMoveTimeout();
      clearSpecialTimeout();
      window.removeEventListener('resize', handleResize);
    };
  }, [
    clearMoveTimeout,
    clearSpecialTimeout,
    enabled,
    getRenderedPosition,
    scheduleMoveAfterIdle,
    setAnimation,
    startMove,
  ]);

  return {
    areaRef,
    characterRef,
    handleCharacterClick,
    motion,
  };
}
