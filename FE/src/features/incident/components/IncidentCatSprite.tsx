import { useEffect, useRef, useState } from 'react';

import catSheet from '@/assets/game/cat.png';

const FRAME_COUNT = 4;
const FRAME_W = 128;
const FRAME_H = 80;
const DISPLAY_W = 200;

const TYPING_KEYS = new Set(['Enter', 'Backspace', 'Space']);
const isTypingKey = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  return e.key.length === 1 || TYPING_KEYS.has(e.key);
};

/**
 * 타자 칠 때 프레임 1↔2 교대, 두 키 동시: 프레임 3, idle: 프레임 0.
 * single 모드 CatSprite와 동일한 로직.
 */
export default function IncidentCatSprite() {
  const [frame, setFrame] = useState(0);
  const nextFrameRef = useRef<1 | 2>(1);
  const heldKeys = useRef(new Set<string>());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setFrame(0), 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTypingKey(e)) return;
      heldKeys.current.add(e.code);
      resetIdle();
      if (heldKeys.current.size >= 2) {
        setFrame(3);
      } else {
        const next = nextFrameRef.current;
        nextFrameRef.current = next === 1 ? 2 : 1;
        setFrame(next);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const scale = DISPLAY_W / FRAME_W;
  const displayH = Math.round(FRAME_H * scale);

  return (
    <div
      className="pixel-art bg-no-repeat"
      style={{
        width: `${DISPLAY_W}px`,
        height: `${displayH}px`,
        backgroundImage: `url(${catSheet})`,
        backgroundSize: `${FRAME_COUNT * FRAME_W * scale}px ${FRAME_H * scale}px`,
        backgroundPosition: `-${frame * DISPLAY_W}px 0`,
      }}
    />
  );
}
