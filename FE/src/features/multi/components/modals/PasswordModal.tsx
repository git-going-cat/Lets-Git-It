import { useState } from 'react';

import { useJoinRoom, useVerifyRoomPassword } from '../../hooks/useRoom';

interface PasswordModalProps {
  roomId: number;
  onClose: () => void;
  onSuccess: (roomId: number) => void;
}

export default function PasswordModal({ roomId, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { mutate: verifyPassword, isPending: isVerifying } = useVerifyRoomPassword();
  const { mutate: joinRoom, isPending: isJoining } = useJoinRoom();

  const isPending = isVerifying || isJoining;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setError('');

    verifyPassword(
      { roomId, password },
      {
        onSuccess: () => {
          joinRoom(roomId, {
            onSuccess: () => onSuccess(roomId),
            onError: () => setError('방 입장에 실패했습니다.'),
          });
        },
        onError: () => setError('비밀번호가 틀렸습니다.'),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-65 overflow-hidden rounded border border-gray-400 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#217346] px-3 py-2">
          <span className="text-xs font-medium text-white">🔒 비밀번호 입력</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <p className="text-xs text-gray-600">비공개 방입니다. 비밀번호를 입력하세요.</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoFocus
              className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
            />
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded border border-[#175c35] bg-[#217346] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#175c35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '확인 중...' : '입장'}
          </button>
        </div>
      </div>
    </div>
  );
}
