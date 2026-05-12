import { type HistoryStatus, useCommandInput } from '../hooks/useCommandInput';

const HISTORY_STATUS_CLASS: Record<HistoryStatus, string> = {
  ok: 'text-green-400/60',
  miss: 'text-yellow-400',
  typo: 'text-red-400',
  'wrong-branch': 'text-red-400',
  switch: 'text-green-400/60',
};

export default function CommandInput() {
  const {
    inputRef,
    inputValue,
    history,
    isPlaying,
    activeBranch,
    handleInputChange,
    handleKeyDown,
  } = useCommandInput();

  return (
    <div className="font-pixel flex h-full w-full overflow-hidden px-2 py-1">
      <div className="nes-container is-dark box-border flex w-full flex-col !px-3 !py-2">
        {/* 히스토리 — 최근 2줄, 위로 쌓이며 하단 정렬. 입력창은 항상 바닥 고정 */}
        <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
          {history.length === 0 ? (
            <p className="text-xl text-gray-500">Waiting for input...</p>
          ) : (
            history.slice(-2).map((entry, i) => (
              <div key={i} className="flex gap-2 text-xl leading-tight">
                <span className="select-none text-gray-500">&gt;</span>
                <span className={HISTORY_STATUS_CLASS[entry.status]}>{entry.text}</span>
              </div>
            ))
          )}
        </div>

        {/* 구분선 */}
        <div className="my-1.5 border-t border-gray-600" />

        {/* 입력줄 — 하단 고정 */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="select-none !text-xl text-cyan-400/80">({activeBranch})</span>
          <span className="select-none !text-2xl text-white">$</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent !text-2xl text-white outline-none"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCopy={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            disabled={!isPlaying}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
