interface TutorialPromptStepProps {
  onYes: () => void;
  onNo: () => void;
}

/**
 * 튜토리얼 진행 여부를 묻는 단계.
 * YES → 튜토리얼 진행, NO → 튜토리얼 스킵 후 온보딩 완료
 */
export default function TutorialPromptStep({ onYes, onNo }: TutorialPromptStepProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-2">
      <p className="text-white text-lg font-semibold text-center">튜토리얼을 하시겠습니까?</p>

      <div className="flex gap-4 w-full">
        <button
          type="button"
          onClick={onNo}
          className="flex-1 py-2.5 rounded text-white font-semibold text-sm transition-colors border! border-red-800! bg-red-950/60! hover:bg-red-900/60!"
        >
          NO!
        </button>
        <button
          type="button"
          onClick={onYes}
          className="flex-1 py-2.5 rounded text-white font-semibold text-sm transition-colors bg-[#0d2a6b]! hover:bg-[#1a3d8c]! border-none!"
        >
          YES!
        </button>
      </div>
    </div>
  );
}
