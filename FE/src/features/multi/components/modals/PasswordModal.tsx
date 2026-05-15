import { useState } from 'react';
import axios from 'axios';
import { LockKeyhole } from 'lucide-react';

import {
  useJoinContributionRoom,
  useJoinCoopRoom,
  useVerifyRoomPassword,
} from '../../hooks/useRoom';

import type { GameMode } from '../../types/room.types';

interface PasswordModalProps {
  roomId: number;
  mode: GameMode;
  onClose: () => void;
  onSuccess: (roomId: number) => void;
  /** 409: 이미 이 방의 멤버 → 재접속 */
  on409?: (roomId: number) => void;
}

export default function PasswordModal({
  roomId,
  mode,
  onClose,
  onSuccess,
  on409,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { mutateAsync: verifyPasswordAsync, isPending: isVerifying } = useVerifyRoomPassword();
  const { mutateAsync: joinContributionRoomAsync, isPending: isJoiningContribution } =
    useJoinContributionRoom();
  const { mutateAsync: joinCoopRoomAsync, isPending: isJoiningCoop } = useJoinCoopRoom();

  const isPending = isVerifying || isJoiningContribution || isJoiningCoop;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setError('');

    try {
      await verifyPasswordAsync({ roomId, password });
    } catch {
      setError('비밀번호가 틀렸습니다.');
      return;
    }

    try {
      if (mode === 'COOP') {
        await joinCoopRoomAsync(roomId);
      } else {
        await joinContributionRoomAsync(roomId);
      }
      onSuccess(roomId);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        on409?.(roomId);
        return;
      }
      setError('방 입장에 실패했습니다.');
    }
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
          <div className="flex items-center gap-1">
            <LockKeyhole className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-medium text-white">비밀번호 입력</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Body + Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 pb-0">
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="-mx-4 flex justify-end gap-2 border-t border-gray-200 px-4 py-2.5">
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
        </form>
      </div>
    </div>
  );
}
