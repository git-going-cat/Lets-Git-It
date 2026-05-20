import FileRow from './FileRow';

import type { FileItem } from '../types/incident.types';

interface PaneProps {
  label: string;
  sublabel: string;
  files: FileItem[];
  warning?: boolean;
  flashIn?: boolean;
  isFlying?: (name: string) => boolean;
  flyDir?: 'forward' | 'back' | null;
}

export default function Pane({
  label,
  sublabel,
  files,
  warning = false,
  flashIn = false,
  isFlying,
  flyDir,
}: PaneProps) {
  return (
    <div
      className={`nes-container is-dark relative !px-3.5 !pt-3.5 !pb-2.5 ${warning ? 'pane-warn !border-4 !border-nes-error bg-nes-danger-tint' : ''}`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div
            className={`text-xl tracking-[0.2em] ${warning ? 'text-nes-pink' : 'text-nes-success'}`}
          >
            {label}
          </div>
          <div className="mt-0.5 text-xl text-white/40">{sublabel}</div>
        </div>
        <div className="flex items-center gap-2">
          {warning && (
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 animate-pulse bg-nes-error" />
              <span className="text-xl tracking-widest text-nes-error">UNSAFE</span>
            </div>
          )}
          {flashIn && (
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 bg-nes-success" />
              <span className="text-xl tracking-widest text-nes-success">OK</span>
            </div>
          )}
          <div className="text-xl text-white/30">{files.length} files</div>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-1">
        {files.length === 0 ? (
          <div className="px-2 py-3 text-xl italic text-white/25">— 비어있음 —</div>
        ) : (
          files.map((f) => (
            <FileRow key={f.name} f={f} flying={isFlying?.(f.name)} flyDir={flyDir} />
          ))
        )}
      </div>
    </div>
  );
}
