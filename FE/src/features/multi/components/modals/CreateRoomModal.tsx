import { useState } from 'react';

import { useCreateRoom } from '../../hooks/useRoom';

import type { GameMode } from '../../types/room.types';

const MODE_LABELS: Record<GameMode, string> = {
  CONTRIBUTION_RUN: '기여도 뺏기',
  TIME_ATTACK: '타임어택',
  COOP: '협력',
};

const LOBBY_MODES: GameMode[] = ['CONTRIBUTION_RUN', 'TIME_ATTACK', 'COOP'];

interface CreateRoomModalProps {
  defaultMode: GameMode;
  onClose: () => void;
  onSuccess: (roomId: number) => void;
}

export default function CreateRoomModal({ defaultMode, onClose, onSuccess }: CreateRoomModalProps) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameMode>(defaultMode);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { mutate: createRoom, isPending } = useCreateRoom();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('방 제목을 입력하세요.');
      return;
    }
    if (hasPassword && !password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setError('');

    const body = {
      title: title.trim(),
      mode,
      hasPassword,
      ...(mode !== 'COOP' && { maxPlayers }),
      ...(hasPassword && { password }),
    };

    createRoom(body, {
      onSuccess: (data) => onSuccess(data.roomId),
      onError: () => setError('방 생성에 실패했습니다. 다시 시도해 주세요.'),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-82.5 overflow-hidden rounded border border-gray-400 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between bg-[#217346] px-3 py-2">
          <span className="text-xs font-medium text-white">방 만들기</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
              title <span className="text-[10px] text-red-500">*필수</span>
            </label>
            <p className="text-[10px] text-gray-400">방 제목을 입력하세요</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="방 제목 입력"
              maxLength={30}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
            />
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
              mode <span className="text-[10px] text-red-500">*필수</span>
            </label>
            <div className="flex gap-1.5">
              {LOBBY_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex flex-1 flex-col items-center rounded border py-1.5 text-center text-[10px] transition-all ${
                    mode === m
                      ? 'border-[#217346] bg-[#d4eadd] font-medium text-[#175c35]'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-[#217346] hover:text-[#217346]'
                  }`}
                >
                  <span className="text-[10px] font-medium">{MODE_LABELS[m]}</span>
                  <span className="font-mono text-[8px] text-gray-400">{m}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MaxPlayers — hidden for COOP */}
          {mode !== 'COOP' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">maxPlayers</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} (기본값)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Password toggle */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">hasPassword</label>
              <button
                type="button"
                onClick={() => setHasPassword((prev) => !prev)}
                className={`relative h-5 w-9 rounded-full border-none transition-colors ${
                  hasPassword ? 'bg-[#217346]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    hasPassword ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Password input */}
          {hasPassword && (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
                password <span className="text-[10px] text-red-500">*필수</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
              />
            </div>
          )}

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
            {isPending ? '생성 중...' : '방 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
