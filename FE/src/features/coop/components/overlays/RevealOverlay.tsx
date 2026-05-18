import { useEffect, useRef, useState } from 'react';

import { useCoopStore } from '../../store/coopStore';

interface RevealOverlayProps {
  delayMs?: number;
  onCountdownComplete: () => void;
  title?: string;
}

function toCountdownSeconds(remainingMs: number) {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export default function RevealOverlay({
  delayMs,
  onCountdownComplete,
  title = '준비하세요',
}: RevealOverlayProps) {
  const revealDelayMs = useCoopStore((state) => state.revealDelayMs);
  const [remainingMs, setRemainingMs] = useState(delayMs ?? revealDelayMs);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (remainingMs <= 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onCountdownComplete();
      return;
    }

    if (remainingMs <= 0) return;

    const timerId = window.setTimeout(() => {
      setRemainingMs((value) => Math.max(0, value - 100));
    }, 100);

    return () => window.clearTimeout(timerId);
  }, [onCountdownComplete, remainingMs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-[rgba(5,8,18,0.28)] font-pixel text-white backdrop-blur-[1px]">
      <div className="mt-24 flex flex-col items-center gap-4">
        <h2 className="text-2xl text-[#F2CB05] drop-shadow-lg">{title}</h2>
        <div className="text-6xl text-[#F2CB05] drop-shadow-lg">
          {toCountdownSeconds(remainingMs)}
        </div>
      </div>
    </div>
  );
}
