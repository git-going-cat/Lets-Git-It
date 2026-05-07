import { useTutorialStep } from '@/features/auth/hooks/useTutorialStep';

interface TutorialStepProps {
  onComplete: () => void;
}

/**
 * 튜토리얼 진행 단계.
 * 13개 단계의 Git 명령어를 터미널 스타일 UI에서 직접 입력하며 학습합니다.
 */
export default function TutorialStep({ onComplete }: TutorialStepProps) {
  const {
    steps,
    currentStep,
    currentCommand,
    stepIndex,
    input,
    setInput,
    isError,
    isLoading,
    loadError,
    handleKeyDown,
    submitInput,
  } = useTutorialStep(onComplete);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-white/50 text-sm animate-pulse">튜토리얼 로딩 중...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-red-400 text-sm">
          튜토리얼 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  if (!currentStep || !currentCommand) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* 진행률 */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          {stepIndex + 1} / {steps.length}
        </span>
        <div className="flex gap-0.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-4 rounded-full ${i < stepIndex ? 'bg-green-500' : i === stepIndex ? 'bg-yellow-400' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      {/* 단계 설명 */}
      <div>
        <p className="text-white font-semibold text-sm">{currentStep.title}</p>
        <p className="text-white/50 text-xs mt-0.5">{currentStep.description}</p>
      </div>

      {/* 명령어 표시 */}
      <div className="bg-black/50 rounded p-3 border border-white/10">
        <p className="text-white/40 text-xs mb-1">입력할 명령어:</p>
        <p className="text-green-400 font-mono text-sm break-all">{currentCommand.command}</p>
        <p className="text-white/30 text-xs mt-1">{currentCommand.explanation}</p>
      </div>

      {/* 터미널 입력창 */}
      <div
        className={`flex items-center gap-2 bg-black/60 rounded border px-3 py-2 ${
          isError ? 'border-red-500' : 'border-white/10'
        }`}
      >
        <span className="text-green-400 font-mono text-sm shrink-0">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="명령어를 입력하세요..."
          autoFocus
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-white/20"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={submitInput}
          className="shrink-0 text-white/30 hover:text-white/60 text-xs transition-colors border-none! bg-transparent!"
        >
          Enter
        </button>
      </div>

      {isError && (
        <p className="text-red-400 text-xs">명령어가 올바르지 않습니다. 다시 입력해주세요.</p>
      )}
    </div>
  );
}
