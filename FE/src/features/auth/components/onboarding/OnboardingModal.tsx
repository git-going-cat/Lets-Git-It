import { type ReactNode, useState } from 'react';

interface OnboardingModalProps {
  title: string;
  children: ReactNode;
  /** 모달 위에 겹쳐 보이는 유령 창 개수 (기본 2) */
  ghostCount?: number;
}

/**
 * Win11 스타일 온보딩 모달 래퍼.
 *
 * - 뒤에 ghostCount개의 더 어두운 유령 창을 겹쳐 깊이감을 연출합니다.
 * - 타이틀 바의 창 제어 버튼(×, □, −)을 클릭하면 "작동하지 않습니다" 툴팁이 표시됩니다.
 */
export default function OnboardingModal({ title, children, ghostCount = 2 }: OnboardingModalProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const showTooltip = () => {
    setTooltipVisible(true);
    setTimeout(() => setTooltipVisible(false), 1800);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
      {/* 유령 창 (뒤에서부터 쌓임) */}
      {Array.from({ length: ghostCount }).map((_, i) => {
        const offset = (ghostCount - i) * 10;
        return (
          <div
            key={i}
            className="absolute rounded-lg border border-white/5"
            style={{
              width: 400,
              height: 320,
              background: `rgba(10, 10, 10, ${0.7 + i * 0.05})`,
              transform: `translate(${offset}px, ${-offset}px)`,
              zIndex: 10 + i,
            }}
          >
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
        );
      })}

      {/* 메인 모달 */}
      <div
        className="relative rounded-lg border border-white/10 shadow-2xl"
        style={{
          width: 400,
          background: 'rgba(19, 19, 19, 0.97)',
          zIndex: 10 + ghostCount + 1,
        }}
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
