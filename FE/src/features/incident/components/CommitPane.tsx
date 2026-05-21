import type { CommitItem } from '../types/incident.types';

interface CommitPaneProps {
  commits: CommitItem[];
  flashIn?: boolean;
}

export default function CommitPane({ commits, flashIn = false }: CommitPaneProps) {
  return (
    <div className="nes-container is-dark relative !px-3.5 !pt-3.5 !pb-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-xl tracking-[0.2em] text-nes-success">COMMITS</div>
          <div className="mt-0.5 text-xl text-white/40">로컬 히스토리 · main</div>
        </div>
        <div className="flex items-center gap-2">
          {flashIn && (
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 bg-nes-success" />
              <span className="text-xl tracking-widest text-nes-success">OK</span>
            </div>
          )}
          <div className="text-xl text-white/30">{commits.length} commits</div>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {commits.map((c, i) => (
          <div
            key={`${c.hash}-${i}`}
            className={`flex items-center gap-2.5 ${c.isNew ? 'commit-pop' : ''}`}
          >
            <div className="relative flex w-3.5 flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${c.isNew ? 'bg-nes-success shadow-commit-new' : c.current ? 'bg-nes-blue shadow-commit-current' : 'bg-nes-gray'}`}
              />
              {i < commits.length - 1 && <div className="absolute top-3 h-7 w-0.5 bg-nes-gray" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xl tabular-nums ${c.isNew ? 'text-nes-success' : c.current ? 'text-nes-blue' : 'text-nes-gray-mid'}`}
                >
                  {c.hash}
                </span>
                <span
                  className={`truncate text-xl ${c.isNew ? 'text-nes-green-light' : 'text-white/65'}`}
                >
                  {c.msg}
                </span>
                {c.isNew && (
                  <span className="border border-nes-success bg-nes-success/15 px-1 py-0.5 text-xl tracking-widest text-nes-success">
                    NEW
                  </span>
                )}
              </div>
              {(c.branch || c.remoteBranch) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.branch && (
                    <span
                      className={`px-1.5 py-0.5 text-xl ${c.isNew ? 'border border-nes-success bg-nes-success/15 text-nes-success' : 'border border-nes-blue bg-nes-blue/15 text-nes-blue'}`}
                    >
                      {c.branch}
                    </span>
                  )}
                  {c.remoteBranch && (
                    <span className="commit-pop border border-nes-yellow bg-nes-yellow/15 px-1.5 py-0.5 text-xl text-nes-yellow">
                      {c.remoteBranch}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
