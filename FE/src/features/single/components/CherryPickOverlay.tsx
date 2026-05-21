import { useEffect, useState } from 'react';

import { singleBus } from '../bridge/singleBus';

const STAMP_MS = 550;

type Phase = 'stamp' | 'fade' | null;

export default function CherryPickOverlay() {
  const [phase, setPhase] = useState<Phase>(null);

  useEffect(() => {
    let stampTimer: ReturnType<typeof setTimeout> | undefined;

    const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 1) return;
      clearTimeout(stampTimer);
      setPhase('stamp');
      stampTimer = setTimeout(() => setPhase('fade'), STAMP_MS);
    };

    const handleEnd = () => {
      clearTimeout(stampTimer);
      setPhase(null);
    };

    const unsubs = [
      singleBus.subscribe('item:use', handleItemUse),
      singleBus.subscribe('cherry-pick:end', handleEnd),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
      clearTimeout(stampTimer);
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
