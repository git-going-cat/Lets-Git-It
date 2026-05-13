import { useId } from 'react';

import { useModal } from '../hooks/useModal';

import type { ReactNode } from 'react';

export interface PixelModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
}

export default function PixelModal({ isOpen, onClose, title, children }: PixelModalProps) {
  const { containerRef } = useModal({ isOpen, onClose });
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-60 bg-black/80">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`nes-container is-dark is-rounded ${title ? 'with-title' : ''} min-w-80 text-base`}
      >
        {title && (
          <p id={titleId} className="title text-base">
            {title}
          </p>
        )}
        <div className="flex flex-col items-center gap-4 text-base">{children}</div>
      </div>
    </div>
  );
}
