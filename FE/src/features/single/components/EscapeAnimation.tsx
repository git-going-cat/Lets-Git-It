import { useEffect, useState } from 'react';

import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import type { CharacterAnimation, CharacterDirection } from '@/shared/components/AnimatedCharacter';

const CLIMB_BASE_MS = 2400;
const PUSH_CART_MS = 1800;
const LIFT_CYCLE_MS = Math.ceil((14 / 6) * 1000); // ~2333ms, one lift cycle

type Phase = 'at-bottom' | 'climbing' | 'arrived';

interface EscapeAnimationProps {
  mode: 'success' | 'escape_failed';
  churuRatio?: number;
  onComplete?: () => void;
}

function useEscapePhase(
  asset: ReturnType<typeof useCurrentCharacterAsset>['data'],
  climbDuration: number,
  mode: 'success' | 'escape_failed',
  onComplete: (() => void) | undefined
): Phase {
  const [phase, setPhase] = useState<Phase>('at-bottom');

  // double-RAF: browser renders at-bottom first, then starts climb transition
  useEffect(() => {
    if (!asset) return;
    let id2: number;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setPhase('climbing'));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [asset]);

  useEffect(() => {
    if (phase === 'climbing') {
      const t = setTimeout(() => setPhase('arrived'), climbDuration);
      return () => clearTimeout(t);
    }
    if (phase === 'arrived') {
      const completionMs = mode === 'success' ? PUSH_CART_MS : LIFT_CYCLE_MS;
      const t = setTimeout(() => onComplete?.(), completionMs);
      return () => clearTimeout(t);
    }
  }, [phase, climbDuration, mode, onComplete]);

  return phase;
}

export default function EscapeAnimation({
  mode,
  churuRatio = 0,
  onComplete,
}: EscapeAnimationProps) {
  const { data: asset, isError } = useCurrentCharacterAsset();

  const stopTop = mode === 'success' ? 15 : 18 + (1 - churuRatio) * 82;
  const climbDuration = Math.round(((110 - stopTop) / 95) * CLIMB_BASE_MS);

  useEffect(() => {
    if (!isError) return;
    onComplete?.();
  }, [isError, onComplete]);

  const phase = useEscapePhase(asset, climbDuration, mode, onComplete);

  if (!asset) return null;

  let animation: CharacterAnimation = 'walk';
  let direction: CharacterDirection = 'back';
  if (phase === 'arrived') {
    animation = mode === 'success' ? 'pushCart' : 'lift';
    direction = 'front';
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: phase === 'at-bottom' ? '110%' : `${stopTop}%`,
          transition: phase === 'climbing' ? `top ${climbDuration}ms linear` : 'none',
        }}
      >
        <AnimatedCharacter
          asset={asset}
          animation={animation}
          direction={direction}
          className="h-24 w-12"
        />
      </div>
    </div>
  );
}
