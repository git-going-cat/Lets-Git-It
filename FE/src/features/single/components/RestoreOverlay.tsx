import { useEffect, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';

export default function RestoreOverlay() {
  const [animKey, setAnimKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;

    const handler = ({ slot }: { slot: 0 | 1 | 2 }) => {
      if (slot !== 2) return;
      clearTimeout(t);
      setVisible(true);
      setAnimKey((k) => k + 1);
      t = setTimeout(() => setVisible(false), 700);
    };

    EventBus.on('item:use', handler);
    return () => {
      EventBus.off('item:use', handler);
      clearTimeout(t);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      {/* text-[120px]: animate-restore-heal scale(0.6→3.5) 기준 크기, 최대 ~420px로 확대되어 플레이 영역에 가득 표시 */}
      <span
        key={animKey}
        className="animate-restore-heal select-none text-[120px] leading-none text-pink-300"
      >
        ♥
      </span>
    </div>
  );
}
