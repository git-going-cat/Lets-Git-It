import { useEffect, useRef, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';

const STASH_DURATION_MS = 5000;

export default function StashOverlay() {
  const [active, setActive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const endStash = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setActive(false);
    activeRef.current = false;
  };

  useEffect(() => {
    const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 0) return;
      endStash();
      setActive(true);
      setActiveCount((c) => c + 1);
      activeRef.current = true;
      timeoutRef.current = setTimeout(endStash, STASH_DURATION_MS);
    };

    const handleCommandComplete = () => {
      if (!activeRef.current) return;
      endStash();
    };

    EventBus.on('item:use', handleItemUse);
    EventBus.on('command:complete', handleCommandComplete);
    return () => {
      EventBus.off('item:use', handleItemUse);
      EventBus.off('command:complete', handleCommandComplete);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(96, 165, 250, 0.04)' }}
    >
      <span
        key={activeCount}
        className="font-pixel animate-stash-bang select-none text-8xl text-blue-200"
        style={{ opacity: 0.2 }}
      >
        STASH!
      </span>
    </div>
  );
}
