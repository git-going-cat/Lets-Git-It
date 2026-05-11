import { useEffect, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';

export default function StashOverlay() {
  const [active, setActive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 0) return;
      setActive(true);
      setActiveCount((c) => c + 1);
    };

    const handleEnd = () => {
      setActive(false);
    };

    EventBus.on('item:use', handleItemUse);
    EventBus.on('stash:end', handleEnd);
    return () => {
      EventBus.off('item:use', handleItemUse);
      EventBus.off('stash:end', handleEnd);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-blue-400/[0.04] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      <span
        key={activeCount}
        className="font-pixel animate-stash-bang select-none text-8xl text-blue-200 opacity-20"
      >
        STASH!
      </span>
    </div>
  );
}
