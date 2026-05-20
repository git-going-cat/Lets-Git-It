interface TopBarProps {
  scenarioId: number;
  scenarioTitle: string;
  difficulty: number;
  stepIdx: number;
  total: number;
  cardTitle?: string;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '입문 ★',
  2: '입문 ★★',
  3: '보통 ★★★',
  4: '어려움 ★★★★',
  5: '전문가 ★★★★★',
};

export default function TopBar({
  scenarioId,
  scenarioTitle,
  difficulty,
  stepIdx,
  total,
  cardTitle,
}: TopBarProps) {
  const diffLabel = DIFFICULTY_LABELS[difficulty] ?? `★`.repeat(difficulty);

  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <div className="flex items-baseline gap-3">
        <span className="text-xl tracking-[0.25em] text-white/40">
          SCENARIO {String(scenarioId).padStart(2, '0')}
        </span>
        <span className="text-3xl text-white">{scenarioTitle}</span>
        <span className="text-base text-white/40">· {diffLabel}</span>
        {cardTitle && (
          <>
            <span className="text-white/20">/</span>
            <span className="text-base text-white/70">{cardTitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xl tracking-widest text-white/40">CARD</span>
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 transition-all duration-200 ${i < stepIdx ? 'bg-nes-success' : i === stepIdx ? 'bg-nes-blue' : 'bg-white/[0.12]'}`}
              style={{ width: i === stepIdx ? 36 : 20 }} /* runtime: 현재 카드 인디케이터 너비 */
            />
          ))}
        </div>
        <span className="tabular-nums text-xl text-white/70">
          {stepIdx + 1} <span className="text-white/30">/ {total}</span>
        </span>
      </div>
    </div>
  );
}
