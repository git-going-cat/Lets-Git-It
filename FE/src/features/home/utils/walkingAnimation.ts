import type { CharacterAnimation, CharacterDirection } from '@/shared/components/AnimatedCharacter';

export const CHARACTER_WIDTH_PX = 48;
export const CHARACTER_HEIGHT_PX = 96;
export const EDGE_PADDING_PX = 8;
export const TOP_SAFE_PX = 72;
export const BOTTOM_SAFE_PX = 64;
export const MIN_MOVE_DISTANCE_PX = 220;
export const MS_PER_PX = 12;
export const MIN_MOVE_MS = 700;
export const MAX_MOVE_MS = 5000;
export const MIN_IDLE_MS = 1000;
export const MAX_IDLE_MS = 2000;

export const SPECIAL_ANIMATION_MS = {
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

export type SpecialAnimation = keyof typeof SPECIAL_ANIMATION_MS;

export interface Position {
  x: number;
  y: number;
}

const SPECIAL_ANIMATIONS = Object.keys(SPECIAL_ANIMATION_MS) as SpecialAnimation[];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 캐릭터 이동 영역 안에서 사용할 수 있는 좌표 범위를 계산합니다.
 */
export function getMovementBounds(containerWidth: number, containerHeight: number) {
  const maxX = Math.max(0, containerWidth - CHARACTER_WIDTH_PX - EDGE_PADDING_PX);
  const minX = Math.min(EDGE_PADDING_PX, maxX);
  const maxY = Math.max(0, containerHeight - CHARACTER_HEIGHT_PX - BOTTOM_SAFE_PX);
  const minY = Math.min(TOP_SAFE_PX, maxY);

  return { maxX, maxY, minX, minY };
}

/**
 * 캐릭터가 너무 짧게 왕복하지 않도록 현재 위치와 거리를 고려해 다음 좌표를 뽑습니다.
 */
export function getRandomPosition(
  containerWidth: number,
  containerHeight: number,
  current?: Position
) {
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

/**
 * 리사이즈 후 현재 렌더 좌표가 이동 가능 영역을 벗어나지 않도록 보정합니다.
 */
export function clampPosition(position: Position, containerWidth: number, containerHeight: number) {
  const { maxX, maxY, minX, minY } = getMovementBounds(containerWidth, containerHeight);

  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY),
  };
}

/**
 * 두 좌표 간 직선 거리를 계산합니다.
 */
export function getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.hypot(toX - fromX, toY - fromY);
}

/**
 * 이동 거리를 기반으로 CSS transition 시간을 계산합니다.
 */
export function getMoveDuration(distance: number): number {
  return Math.round(clamp(distance * MS_PER_PX, MIN_MOVE_MS, MAX_MOVE_MS));
}

/**
 * 현재 애니메이션이 클릭으로 실행되는 특수 애니메이션인지 판별합니다.
 */
export function isSpecialAnimation(animation: CharacterAnimation): animation is SpecialAnimation {
  return animation in SPECIAL_ANIMATION_MS;
}

/**
 * 클릭 시 재생할 특수 애니메이션을 무작위로 선택합니다.
 */
export function getRandomSpecialAnimation(): SpecialAnimation {
  return SPECIAL_ANIMATIONS[Math.floor(Math.random() * SPECIAL_ANIMATIONS.length)];
}

/**
 * 이동 방향에 맞는 걷기 방향을 계산합니다.
 */
export function getWalkDirection(fromX: number, toX: number): CharacterDirection {
  return toX >= fromX ? 'right' : 'left';
}

/**
 * 특수 애니메이션별로 유지해야 하는 방향을 계산합니다.
 */
export function getSpecialDirection(
  animation: SpecialAnimation,
  previousDirection: CharacterDirection
): CharacterDirection {
  if (animation === 'sit1' || animation === 'sit2' || animation === 'pushCart') {
    return previousDirection === 'left' ? 'left' : 'right';
  }

  return 'front';
}
