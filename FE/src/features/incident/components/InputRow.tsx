import { useEffect, useRef } from 'react';

import ScoreRow from './ScoreRow';

import type { HistoryEntry, Phase, ScoreResult } from '../types/incident.types';

interface InputRowProps {
  input: string;
  setInput: (v: string) => void;
  phase: Phase;
  onFinalize: () => void;
  onRetry: () => void;
  onShowAnswer: () => void;
  onNext: () => void;
  scored: ScoreResult | null;
  history: HistoryEntry[];
  isLastCard: boolean;
  focusTrigger?: number;
  currentBranch?: string;
  aiCoachingLoading?: boolean;
}

export default function InputRow({
  input,
  setInput,
  phase,
  onFinalize,
  onRetry,
  onShowAnswer,
  onNext,
  scored,
  history,
  isLastCard,
  focusTrigger,
  currentBranch = 'main',
  aiCoachingLoading = false,
}: InputRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const phaseMountedRef = useRef(false);
  const triggerMountedRef = useRef(false);

  // 마운트 시 skip: intro/mission 모달이 먼저 표시되므로 최초 포커스는 모달에 위임
  useEffect(() => {
    if (!phaseMountedRef.current) {
      phaseMountedRef.current = true;
      return;
    }
    if (phase === 'idle') inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!triggerMountedRef.current) {
      triggerMountedRef.current = true;
      return;
    }
    if (focusTrigger === undefined) return;
    if (phase === 'idle') inputRef.current?.focus();
  }, [focusTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'scored' || aiCoachingLoading) return;
    const id = setTimeout(() => nextBtnRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [phase, aiCoachingLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'idle' && input.trim()) onFinalize();
    }
  };

  const statusColor =
    scored?.status === 'perfect' || scored?.status === 'accepted'
      ? '#92cc41'
      : scored?.status === 'partial'
        ? '#f0c64a'
        : scored?.status === 'forbidden' ||
            scored?.status === 'wrong' ||
            scored?.status === 'lower-retry'
          ? '#e76e55'
          : undefined;

  return (
    <div className="flex h-[220px] items-stretch gap-3">
      {/* Terminal */}
      <div
        className="nes-container is-dark box-border flex flex-1 flex-col !px-3 !py-2"
        style={{ borderColor: statusColor }}
      >
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-gray-400/30"
        >
          {history.length === 0 ? (
            <p className="m-auto text-xl text-gray-500">Waiting for input...</p>
          ) : (
            history.map((h, i) => (
              <div key={i} className="mb-1">
                <div className="flex gap-2 text-xl leading-tight">
                  <span className="shrink-0 select-none text-cyan-400/80">({currentBranch}) $</span>
                  <span
                    className="flex-1 break-all"
                    style={{ color: h.color }} /* runtime: 점수 상태별 색 */
                  >
                    {h.text}
                  </span>
                  <span
                    className="shrink-0 text-base tabular-nums"
                    style={{ color: h.color }} /* runtime: 점수 상태별 색 */
                  >
                    {h.score} pts
                  </span>
                </div>
                {h.mockOutput && (
                  <pre className="m-0 ml-6 overflow-hidden! whitespace-pre-wrap font-mono text-sm leading-snug text-white/80">
                    {h.mockOutput}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        <div className="my-1.5 border-t border-gray-600" />

        <div className="flex shrink-0 items-center gap-2">
          <span className="select-none !text-xl text-cyan-400/80">({currentBranch})</span>
          <span className="select-none !text-2xl text-white">$</span>
          {phase === 'idle' ? (
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              className="flex-1 bg-transparent !text-2xl text-white outline-none"
              spellCheck={false}
              autoComplete="off"
              maxLength={50}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
          ) : (
            <span className="flex-1 truncate !text-2xl text-white opacity-[0.55]">{input}</span>
          )}
        </div>
      </div>

      {/* Action panel */}
      <div className="flex w-[360px] flex-col gap-2">
        {phase === 'idle' && (
          <button
            type="button"
            className="nes-btn is-primary h-full !text-xl"
            onClick={onFinalize}
            disabled={!input.trim()}
          >
            ⏎ 채점하기
          </button>
        )}

        {phase === 'scored' && aiCoachingLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <span className="text-base text-gray-400">채점 중</span>
            <span className="loader" />
          </div>
        )}

        {phase === 'scored' && !aiCoachingLoading && scored && (
          <>
            <div
              className="nes-container score-pop flex w-full flex-1 items-center gap-3 bg-white !p-2"
              style={{ borderColor: statusColor }} /* runtime: 점수 상태별 테두리 색 */
            >
              <div
                className="tabular-nums text-4xl leading-none"
                style={{ color: statusColor }} /* runtime: 점수 상태별 색 */
              >
                {String(scored.total).padStart(3, '0')}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-base text-gray-600">
                <ScoreRow label="명령어" have={scored.base > 0} pts={scored.base} max={40} />
                <ScoreRow label="필수옵션" have={scored.must > 0} pts={scored.must} max={40} />
                <ScoreRow label="권장형식" have={scored.bonus > 0} pts={scored.bonus} max={20} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_2fr_1fr] gap-1">
              <button type="button" className="nes-btn !text-xs" onClick={onRetry}>
                ← 재시도
              </button>
              <button
                type="button"
                className="nes-btn is-warning !text-sm whitespace-nowrap"
                onClick={onShowAnswer}
              >
                답안/해설보기
              </button>
              <button
                ref={nextBtnRef}
                type="button"
                className="nes-btn is-success !text-xs"
                onClick={onNext}
              >
                {isLastCard ? '완료!' : '다음▶'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
