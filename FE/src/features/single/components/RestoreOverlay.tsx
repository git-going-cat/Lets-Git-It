import { useEffect, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';

export default function RestoreOverlay() {
  const [animKey, setAnimKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 2) return;
      setVisible(true);
      setAnimKey((k) => k + 1);
      setTimeout(() => setVisible(false), 700);
    };
    EventBus.on('item:use', handler);
    return () => {
      EventBus.off('item:use', handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span
        key={animKey}
        className="animate-restore-heal select-none text-[120px] leading-none text-pink-300"
      >
        ♥
      </span>
    </div>
  );
}
