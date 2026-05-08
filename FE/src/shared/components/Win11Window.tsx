import { createPortal } from 'react-dom';

import type { ReactNode } from 'react';

export interface Win11WindowProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  glass?: boolean;
  className?: string;
}

export function Win11Window({
  title,
  onClose,
  children,
  glass = false,
  className = '',
}: Win11WindowProps) {
  const windowBg = glass
    ? 'bg-white/40 backdrop-blur-md border border-white/50 shadow-2xl'
    : 'bg-[#fafafa] shadow-lg';

  const titleBg = glass
    ? 'bg-white/30 border-b border-white/40 text-gray-800'
    : 'bg-[#f3f3f3] border-b border-gray-200 text-gray-800';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`rounded-lg overflow-hidden flex flex-col min-w-[300px] ${windowBg} ${className}`}
      >
        {/* Title Bar */}
        <div className={`px-3 py-2 flex items-center justify-between select-none ${titleBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-black/10 rounded transition-colors">
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
            <button className="p-1 hover:bg-black/10 rounded transition-colors">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="2.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
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
        <div className="p-4 flex-1 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
