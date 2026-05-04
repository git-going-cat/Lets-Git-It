import { useModal } from '../hooks/useModal';

import type { ReactNode } from 'react';

export interface PixelModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
}

export default function PixelModal({ isOpen, onClose, title, children }: PixelModalProps) {
  useModal({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
      <div className={`nes-container is-dark is-rounded${title ? 'with-title' : ''} min-w-80`}>
        {title && <p className="title">{title}</p>}
        <div className="flex flex-col items-center gap-4">{children}</div>
      </div>
    </div>
  );
}
