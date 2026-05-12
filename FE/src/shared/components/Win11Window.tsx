import { useId, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ReactNode, RefObject } from 'react';

export interface Win11WindowProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  glass?: boolean;
  className?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
  ariaLabel?: string;
}

export function Win11Window({
  title,
  onClose,
  children,
  glass = false,
  className = '',
  containerRef,
  ariaLabel,
}: Win11WindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const titleId = useId();

  const windowBg = glass
    ? 'bg-white/40 backdrop-blur-md border border-white/50 shadow-2xl'
    : 'bg-[#fafafa] shadow-lg';

  const titleBg = glass
    ? 'bg-white/30 border-b border-white/40 text-gray-800'
    : 'bg-[#f3f3f3] border-b border-gray-200 text-gray-800';

  return createPortal(
    <div className="fixed inset-0 z-window flex items-center justify-center bg-black/50 p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        // h/w-[calc(...)]: Win11 스타일 최대화 상태에서 화면 여백을 유지하며 모달을 확장합니다.
        className={`flex min-w-window-min flex-col overflow-hidden rounded-lg ${windowBg} ${className} ${
          isMaximized ? 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none' : ''
        }`}
      >
        {/* Title Bar */}
        <div className={`flex items-center justify-between px-3 py-2 select-none ${titleBg}`}>
          <div className="flex items-center gap-2">
            <span id={title ? titleId : undefined} className="text-base font-semibold">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-black/10"
              aria-label="최소화"
              title="최소화"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="rounded p-1 transition-colors hover:bg-black/10"
              aria-label={isMaximized ? '이전 크기로 복원' : '최대화'}
              title={isMaximized ? '이전 크기로 복원' : '최대화'}
            >
              {isMaximized ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4.5 4.5V2.5H9.5V7.5H7.5" stroke="currentColor" strokeWidth="1" />
                  <rect
                    x="2.5"
                    y="4.5"
                    width="5"
                    height="5"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="transparent"
                  />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2.5"
                    y="2.5"
                    width="7"
                    height="7"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-red-500 hover:text-white"
              aria-label="닫기"
              title="닫기"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
