import { type ReactNode, useEffect, useRef, useState } from 'react';

interface OnboardingModalProps {
  title: string;
  children: ReactNode;
  /** 모달 위에 겹쳐 보이는 유령 창 개수 (기본 2, 최대 2) */
  ghostCount?: number;
  /**
   * 메인 모달 너비 등 커스텀 Tailwind 클래스.
   * 기본값: `w-100` (= 400px)
   * 예시: `'w-[680px]'` (인트로 영상 단계처럼 더 넓은 모달이 필요한 경우)
   */
  modalClassName?: string;
}

/** 유령 창 단계별 고정 Tailwind 클래스 (최대 2개) */
const GHOST_CLASSES = [
  'w-[400px] h-[320px] bg-[rgba(10,10,10,0.70)] translate-x-[20px] -translate-y-[20px] z-[10]',
  'w-[400px] h-[320px] bg-[rgba(10,10,10,0.75)] translate-x-[10px] -translate-y-[10px] z-[11]',
] as const;

/**
 * Win11 스타일 온보딩 모달 래퍼.
 *
 * - 뒤에 ghostCount개의 더 어두운 유령 창을 겹쳐 깊이감을 연출합니다.
 * - 타이틀 바의 창 제어 버튼(×, □, −)을 클릭하면 "작동하지 않습니다" 툴팁이 표시됩니다.
 */
export default function OnboardingModal({
  title,
  children,
  ghostCount = 2,
  modalClassName,
}: OnboardingModalProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    // 연속 클릭 시 이전 타이머 취소 후 새로 시작 (타이머 누수 방지)
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipVisible(true);
    tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 1800);
  };

  // 언마운트 시 잔여 타이머 정리 (unmounted setState 경고 방지)
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const visibleGhostCount = Math.min(ghostCount, GHOST_CLASSES.length);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-10">
      {/* 유령 창 (뒤에서부터 쌓임) */}
      {Array.from({ length: visibleGhostCount }).map((_, i) => (
        <div key={i} className={`absolute rounded-lg border border-white/5 ${GHOST_CLASSES[i]}`}>
          {/* 유령 창 타이틀 바 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-white/20 text-xs">
              <span>⚠</span>
              <span>{title}</span>
            </div>
            <div className="flex gap-1.5">
              {['−', '□', '×'].map((btn) => (
                <div
                  key={btn}
                  className="w-4 h-4 rounded-sm bg-white/5 flex items-center justify-center text-[9px] text-white/20"
                >
                  {btn}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* 메인 모달 */}
      <div
        className={`relative bg-[rgba(19,19,19,0.97)] rounded-lg border border-white/10 shadow-2xl z-13 ${modalClassName ?? 'w-100'}`}
      >
        {/* 타이틀 바 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <span className="text-yellow-400">⚠</span>
            <span className="font-medium">{title}</span>
          </div>
          <div className="relative flex gap-1.5">
            {['−', '□', '×'].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={showTooltip}
                className="w-5 h-5 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] text-white/50 transition-colors border-none!"
                aria-label={`창 ${btn}`}
              >
                {btn}
              </button>
            ))}
            {tooltipVisible && (
              <div className="absolute -bottom-8 right-0 bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px] text-white/60 whitespace-nowrap">
                작동하지 않습니다
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
