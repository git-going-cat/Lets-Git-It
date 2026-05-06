import { useEffect, useRef, useState } from 'react';

import catSheet from '@/assets/game/cat.png';

const FRAME_COUNT = 4;
const FRAME_W = 128;
const FRAME_H = 80;
const DISPLAY_W = 160;
const IDLE_TIMEOUT_MS = 200;

const TYPING_KEYS = new Set(['Enter', 'Backspace', 'Space']);

const isTypingKey = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  return e.key.length === 1 || TYPING_KEYS.has(e.key);
};

/**
 * 단일 키: frame 1↔2 교대, 두 키 동시: frame 3, 입력 없으면 frame 0(idle).
 */
export default function CatSprite() {
  const [frame, setFrame] = useState(0);
  const nextFrameRef = useRef<1 | 2>(1);
  const heldKeys = useRef(new Set<string>());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setFrame(0), IDLE_TIMEOUT_MS);
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

  return (
    <div
      // h-[100px] w-[160px]: 원본 128x80 스프라이트 비율을 1.25배로 맞춘 표시 크기입니다.
      className="pixel-art h-[100px] w-[160px] bg-no-repeat"
      // 스프라이트 시트 프레임 전환은 현재 frame 값으로 backgroundPosition을 런타임 계산해야 해서 Tailwind 정적 클래스로 표현할 수 없습니다.
      style={{
        backgroundImage: `url(${catSheet})`,
        backgroundSize: `${FRAME_COUNT * FRAME_W * scale}px ${FRAME_H * scale}px`,
        backgroundPosition: `-${frame * DISPLAY_W}px 0`,
      }}
    />
  );
}
