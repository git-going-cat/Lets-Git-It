import type { FileItem } from '../types/incident.types';

interface FileRowProps {
  f: FileItem;
  flying?: boolean;
  flyDir?: 'forward' | 'back' | null;
}

export default function FileRow({ f, flying = false, flyDir }: FileRowProps) {
  const iconColorClass =
    f.kind === 'danger'
      ? 'text-nes-error'
      : f.status === 'added'
        ? 'text-nes-success'
        : f.kind === 'untracked'
          ? 'text-nes-yellow'
          : 'text-nes-blue';

  const nameColorClass =
    f.kind === 'danger'
      ? 'text-nes-pink'
      : f.kind === 'untracked'
        ? 'text-nes-yellow'
        : 'text-nes-fg';

  const flyClass = flying ? (flyDir === 'forward' ? 'file-fly-forward' : 'file-fly') : '';

  return (
    <div
      className={`file-row flex items-center gap-2 border-l-[3px] px-2 py-1 ${f.kind === 'danger' ? 'file-danger border-l-nes-error' : 'border-l-transparent'} ${flyClass}`}
    >
      <span className={`w-5 shrink-0 text-center text-xl ${iconColorClass}`}>{f.icon}</span>
      <span className={`flex-1 truncate text-xl ${nameColorClass}`}>{f.name}</span>
      {f.kind === 'danger' && (
        <span className="shrink-0 text-xl tracking-widest text-nes-error">RISK</span>
      )}
      {f.kind === 'untracked' && (
        <span className="shrink-0 text-xl tracking-widest text-nes-yellow">UNTRACKED</span>
      )}
    </div>
  );
}
