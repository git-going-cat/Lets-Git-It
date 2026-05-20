interface ScoreRowProps {
  label: string;
  have: boolean;
  pts: number;
  max: number;
}

export default function ScoreRow({ label, have, pts, max }: ScoreRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 ${have ? 'bg-nes-success' : 'bg-nes-gray'}`} />
      <span className="w-20 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded-sm bg-gray-200">
        <div
          className={`h-full transition-[width] duration-[250ms] ${have ? 'bg-nes-success' : 'bg-nes-gray'}`}
          style={{ width: `${(pts / max) * 100}%` }} /* runtime: 점수 비율로 바 너비 결정 */
        />
      </div>
      <span
        className={`w-10 shrink-0 text-right tabular-nums ${have ? 'text-nes-success' : 'text-nes-gray-dark'}`}
      >
        +{pts}
      </span>
    </div>
  );
}
