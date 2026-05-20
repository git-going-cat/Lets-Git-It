import { useEffect, useRef } from 'react';

import type { Card } from '../types/incident.types';

interface ScenarioResultModalProps {
  cards: Card[];
  scores: Record<string, number>;
  onExit: () => void;
  onNextMission: (() => void) | null;
  onRetry: () => void;
}

export default function ScenarioResultModal({
  cards,
  scores,
  onExit,
  onNextMission,
  onRetry,
}: ScenarioResultModalProps) {
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const totalScore = cards.reduce((sum, card) => sum + (scores[card.id] ?? 0), 0);
  const maxScore = cards.length * 100;
  const pct = totalScore / maxScore;
  const starCount = pct >= 1 ? 5 : pct >= 0.8 ? 4 : pct >= 0.6 ? 3 : pct >= 0.4 ? 2 : 1;

  useEffect(() => {
    const id = setTimeout(() => primaryBtnRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="nes-container is-dark with-title w-full max-w-md">
        <p className="title text-xl">RESULT</p>

        <div className="flex flex-col gap-4 p-1">
          {/* 총 점수 */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-xl text-white/50">총 점수</div>
            <div className="tabular-nums text-6xl font-bold text-nes-success">
              {String(totalScore).padStart(3, '0')}
            </div>
            <div className="text-xl text-white/40">/ {maxScore}점</div>
          </div>

          {/* 별점 */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={`nes-icon star is-medium ${i < starCount ? '' : 'is-empty'}`} />
            ))}
          </div>

          {/* 카드별 점수 */}
          <div className="nes-container is-dark !px-3 !py-2 flex flex-col gap-1">
            {cards.map((card, i) => {
              const best = scores[card.id] ?? 0;
              const color = best >= 80 ? '#92cc41' : best >= 40 ? '#f0c64a' : '#e76e55';
              return (
                <div key={card.id} className="flex items-center justify-between text-xl">
                  <span className="text-white/60 truncate flex-1 mr-2">
                    {i + 1}. {card.title}
                  </span>
                  <span
                    className="tabular-nums shrink-0"
                    style={{ color }} /* runtime: 점수 구간별 색 */
                  >
                    {best}pts
                  </span>
                </div>
              );
            })}
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-2">
            {onNextMission && (
              <button
                ref={primaryBtnRef}
                type="button"
                className="nes-btn is-success w-full !text-xl"
                onClick={onNextMission}
              >
                ▶ 다음 임무 시작하기
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                ref={onNextMission ? undefined : primaryBtnRef}
                type="button"
                className="nes-btn !text-base"
                onClick={onRetry}
              >
                ↺ 다시하기
              </button>
              <button type="button" className="nes-btn is-error !text-base" onClick={onExit}>
                ← 나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
