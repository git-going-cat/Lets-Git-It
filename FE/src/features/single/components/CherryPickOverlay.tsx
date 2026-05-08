import { useEffect, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';

import { CHERRY_PICK_ANIM_MS } from '../constants/itemAnimations';

const STAMP_MS = 550;

type Phase = 'stamp' | 'fade' | null;

export default function CherryPickOverlay() {
  const [phase, setPhase] = useState<Phase>(null);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;

    const handler = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 1) return;
      clearTimeout(t1);
      clearTimeout(t2);
      setPhase('stamp');
      t1 = setTimeout(() => setPhase('fade'), STAMP_MS);
      t2 = setTimeout(() => setPhase(null), CHERRY_PICK_ANIM_MS);
    };

    EventBus.on('item:use', handler);
    return () => {
      EventBus.off('item:use', handler);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!phase) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span
        className={`select-none text-[100px] leading-none ${
          phase === 'stamp' ? 'animate-paw-stamp' : 'animate-paw-fade'
        }`}
      >
        🐾
      </span>
    </div>
  );
}
