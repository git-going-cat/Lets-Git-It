import { useEffect, useRef } from 'react';

interface IntroStepProps {
  onDone: () => void;
}

/**
 * 온보딩 인트로 단계.
 * 인트로 영상(준비 전까지 애니메이션으로 대체)을 표시하며, 스킵하거나 자동 완료됩니다.
 */
export default function IntroStep({ onDone }: IntroStepProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 10초 후 자동 진행
  useEffect(() => {
    timerRef.current = setTimeout(onDone, 10000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDone]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* 인트로 애니메이션 영역 */}
      <div className="relative w-48 h-24 flex items-center justify-center">
        <p className="text-4xl font-bold text-green-400 font-mono animate-pulse tracking-widest">
          &gt;_ git
        </p>
      </div>

      <div className="text-center">
        <p className="text-white font-semibold text-lg">Let's Git It에 오신 걸 환영합니다!</p>
        <p className="text-white/50 text-sm mt-1">Git 명령어를 게임으로 배워보세요.</p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors border-none!"
      >
        건너뛰기
      </button>
    </div>
  );
}
