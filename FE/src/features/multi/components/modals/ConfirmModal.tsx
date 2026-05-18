import { useModal } from '@/shared/hooks/useModal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: 'primary' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmTone = 'primary',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const { containerRef } = useModal({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="flex w-80 flex-col gap-4 rounded-lg bg-white p-6 shadow-2xl ring-1 ring-black/10"
      >
        <h2 id="confirm-modal-title" className="text-base font-semibold text-gray-800">
          {title}
        </h2>
        <p className="text-sm text-gray-500">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 text-sm font-medium text-white ${
              confirmTone === 'danger'
                ? 'border border-red-500 bg-red-500 hover:bg-red-600'
                : 'border border-[#175c35] bg-[#217346] hover:bg-[#175c35]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
