import { Settings, X } from 'lucide-react';

import { useModal } from '@/shared/hooks/useModal';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | null | undefined;
  mode: string | null | undefined;
  teamName: string | null | undefined;
}

export function EditRoomModal({ isOpen, onClose, title, mode, teamName }: EditRoomModalProps) {
  const { containerRef } = useModal({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="방 수정"
        tabIndex={-1}
        className="flex w-85 flex-col overflow-hidden rounded-lg bg-[#f0f0f0] shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex h-9 items-center gap-2 bg-[#217346] px-3">
          <Settings className="h-4 w-4 text-white/60" />
          <span className="flex-1 text-sm font-medium text-white">방 수정</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-red-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-gray-400">방 제목</span>
            <input
              type="text"
              defaultValue={title ?? ''}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#217346]"
            />
          </div>
          {mode === 'COOP' && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs text-gray-400">팀명</span>
              <input
                type="text"
                defaultValue={teamName ?? ''}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[#217346]"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-300 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            className="rounded border border-[#175c35] bg-[#217346] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#175c35]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
