import type { ReactNode } from 'react';

export interface Win11WindowProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
}

export function Win11Window({ title, onClose, children }: Win11WindowProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-md shadow-lg overflow-hidden flex flex-col min-w-[300px]">
        {/* Title Bar */}
        <div className="bg-[#f3f3f3] px-3 py-2 flex items-center justify-between select-none border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-200 rounded">
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
            <button className="p-1 hover:bg-gray-200 rounded">
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
            <button onClick={onClose} className="p-1 hover:bg-red-500 hover:text-white rounded">
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
        <div className="p-4 bg-[#fafafa]">{children}</div>
      </div>
    </div>
  );
}
