import { useEffect, useRef } from 'react';

import { useModal } from '@/shared/hooks/useModal';

import type { Scenario } from '../types/incident.types';

interface ScenarioIntroModalProps {
  scenario: Scenario;
  onStart: () => void;
}

export default function ScenarioIntroModal({ scenario, onStart }: ScenarioIntroModalProps) {
  const { containerRef } = useModal({ isOpen: true });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setTimeout(() => btnRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);
  const stars = Array.from({ length: 5 }, (_, i) => i < scenario.difficulty);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scenario-intro-title"
        tabIndex={-1}
        className="nes-container is-dark with-title w-full max-w-lg"
      >
        <p className="title text-xl">MISSION</p>

        <div className="flex flex-col gap-4 p-1">
          <div className="flex items-center gap-3">
            <p id="scenario-intro-title" className="text-3xl font-bold text-yellow-400">
              {scenario.title}
            </p>
            <div className="flex gap-0.5">
              {stars.map((filled, i) => (
                <i key={i} className={`nes-icon star is-small ${filled ? '' : 'is-empty'}`} />
              ))}
            </div>
          </div>

          <div
            className="nes-container is-dark !px-4 !py-3 bg-nes-blue/6"
            style={{ borderColor: '#5fbef0' }} /* NES .nes-container border-color override */
          >
            <p className="whitespace-pre-line text-xl leading-relaxed text-white/90">
              {scenario.story}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl text-white/40">총</span>
            <span className="text-xl text-yellow-400">{scenario.cards.length}개</span>
            <span className="text-xl text-white/40">미션을 완료하세요.</span>
          </div>

          <button
            ref={btnRef}
            type="button"
            className="nes-btn is-success w-full !text-xl"
            onClick={onStart}
          >
            ▶ 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
