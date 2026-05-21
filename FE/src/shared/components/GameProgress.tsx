export interface GameProgressProps {
  value: number;
  total: number;
  elapsedMs: number;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameProgress({ value, total, elapsedMs }: GameProgressProps) {
  const clamped = Math.min(value, total);
  const pct = total > 0 ? Math.round((clamped / total) * 100) : 0;

  return (
    <div className="font-pixel flex w-full items-center gap-4 px-4 py-2">
      <span className="shrink-0 text-2xl text-gray-800">
        {clamped}/{total}
      </span>
      <progress className="nes-progress is-primary w-full" value={clamped} max={total} />
      <span className="shrink-0 text-2xl text-gray-800">{pct}%</span>
      <span className="shrink-0 text-2xl text-gray-800">⏱ {formatTime(elapsedMs)}</span>
    </div>
  );
}
