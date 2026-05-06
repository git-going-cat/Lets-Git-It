import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';

import churuImg from '@/assets/game/churu.png';

import { churuCountAtom } from '../store/churuAtom';

interface ChuruItemProps {
  finalBottom: number;
  startBottom: number;
}

function ChuruItem({ finalBottom, startBottom }: ChuruItemProps) {
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    // 두 번의 rAF: 초기 위치가 렌더된 후 transition 시작
    const id = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setDropped(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // transition-[bottom]: Tailwind에 bottom 전용 transition 없음 / duration-[400ms]: 표준 스케일(300·500) 사이 값
  const transitionClass = dropped
    ? 'transition-[bottom] duration-[400ms] ease-out'
    : 'transition-none';

  return (
    <img
      src={churuImg}
      alt=""
      draggable={false}
      className={`pixel-art absolute left-1/2 w-11/12 -translate-x-1/2 ${transitionClass}`}
      style={{
        bottom: dropped ? finalBottom : startBottom,
      }}
    />
  );
}

interface ChuruStackProps {
  /** SWITCH 제외 총 명령어 수. 이 값으로 step을 계산해 겹침 정도를 결정 */
  totalCommands: number;
}

export default function ChuruStack({ totalCommands }: ChuruStackProps) {
  const count = useAtomValue(churuCountAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const step = containerH / Math.max(totalCommands, 1);

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      {containerH > 0 &&
        Array.from({ length: count }, (_, i) => (
          <ChuruItem key={i} finalBottom={i * step} startBottom={containerH} />
        ))}
    </div>
  );
}
