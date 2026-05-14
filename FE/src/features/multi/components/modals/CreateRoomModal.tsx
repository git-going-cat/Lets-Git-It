import { useState } from 'react';

import { useCoopMaps, useCreateContributionRoom, useCreateCoopRoom } from '../../hooks/useRoom';

import type { GameMode } from '../../types/room.types';

type CreateRoomMode = 'CONTRIBUTION' | 'COOP';

const PAGE_SIZE = 3;

const MODE_LABELS: Record<CreateRoomMode, string> = {
  CONTRIBUTION: '기여도 뺏기',
  COOP: '협력',
};

const CREATE_MODES: CreateRoomMode[] = ['CONTRIBUTION', 'COOP'];

interface CreateRoomModalProps {
  defaultMode: GameMode;
  onClose: () => void;
  onSuccess: (roomId: number) => void;
}

export default function CreateRoomModal({ defaultMode, onClose, onSuccess }: CreateRoomModalProps) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<CreateRoomMode>(
    defaultMode === 'COOP' ? 'COOP' : 'CONTRIBUTION'
  );
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [teamName, setTeamName] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapOffset, setMapOffset] = useState(0);

  const { data: mapData, isLoading: isLoadingMaps } = useCoopMaps(mode === 'COOP');

  const handleModeChange = (m: CreateRoomMode) => {
    setMode(m);
    setSelectedMapId(null);
    setMapOffset(0);
  };

  const { mutate: createContributionRoom, isPending: isContributionPending } =
    useCreateContributionRoom();
  const { mutate: createCoopRoom, isPending: isCoopPending } = useCreateCoopRoom();

  const isPending = isContributionPending || isCoopPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('방 제목을 입력하세요.');
      return;
    }
    if (mode === 'COOP' && !teamName.trim()) {
      setError('팀 이름을 입력하세요.');
      return;
    }
    if (mode === 'COOP' && !selectedMapId) {
      setError('맵을 선택하세요.');
      return;
    }
    if (hasPassword && !password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setError('');

    const onSuccess_ = (data: { roomId: number }) => onSuccess(data.roomId);
    const onError = () => setError('방 생성에 실패했습니다. 다시 시도해 주세요.');

    if (mode === 'COOP') {
      createCoopRoom(
        {
          title: title.trim(),
          teamName: teamName.trim(),
          hasPassword,
          selectedMapId: selectedMapId!,
          ...(hasPassword && { password }),
        },
        { onSuccess: onSuccess_, onError }
      );
    } else {
      createContributionRoom(
        {
          title: title.trim(),
          maxPlayers,
          hasPassword,
          ...(hasPassword && { password }),
        },
        { onSuccess: onSuccess_, onError }
      );
    }
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
            <label className="flex items-center gap-1 text-md font-medium text-gray-700">
              방 제목 <span className="text-xs text-red-500">*필수</span>
            </label>
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
            <label className="flex items-center gap-1 text-md font-medium text-gray-700">
              게임 모드 <span className="text-xs text-red-500">*필수</span>
            </label>
            <div className="flex gap-1.5">
              {CREATE_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`flex flex-1 flex-col items-center rounded border py-1.5 text-center text-xs transition-all ${
                    mode === m
                      ? 'border-[#217346] bg-[#d4eadd] font-medium text-[#175c35]'
                      : 'border-gray-300 bg-white text-gray-500 hover:border-[#217346] hover:text-[#217346]'
                  }`}
                >
                  <span className="text-xs font-medium">{MODE_LABELS[m]}</span>
                  <span className="font-mono text-xs text-gray-400">{m}</span>
                </button>
              ))}
            </div>
            {mode === 'COOP' && <p className="text-xs text-gray-400">협력 모드 - 4명 고정</p>}
          </div>

          {/* MaxPlayers — 기여도 뺏기 전용 */}
          {mode === 'CONTRIBUTION' && (
            <div className="flex flex-col gap-1">
              <label className="text-md font-medium text-gray-700">플레이어 수</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TeamName — 협력 전용 */}
          {mode === 'COOP' && (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-md font-medium text-gray-700">
                팀 이름 <span className="text-xs text-red-500">*필수</span>
              </label>
              <p className="text-xs text-gray-400">팀 이름으로 랭킹이 표시됩니다.</p>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="팀 이름 입력"
                maxLength={20}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#217346]"
              />
            </div>
          )}

          {/* Map selection — 협력 전용 */}
          {mode === 'COOP' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-md font-medium text-gray-700">
                  맵 선택 <span className="text-xs text-red-500">*필수</span>
                </label>
                {mapData && (
                  <span className="text-xs text-gray-400">
                    {mapOffset + 1}–{Math.min(mapOffset + PAGE_SIZE, mapData.maps.length)} /{' '}
                    {mapData.maps.length}
                  </span>
                )}
              </div>
              {isLoadingMaps ? (
                <p className="text-xs text-gray-400">맵 목록 로딩 중...</p>
              ) : mapData ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMapOffset((o) => Math.max(0, o - 1))}
                    disabled={mapOffset === 0}
                    className="flex h-14 w-6 shrink-0 items-center justify-center rounded border border-gray-300 text-base font-bold text-gray-500 transition-all hover:border-[#217346] hover:text-[#217346] disabled:cursor-default disabled:border-gray-100 disabled:text-gray-200"
                  >
                    ‹
                  </button>
                  <div className="flex flex-1 gap-1 overflow-hidden">
                    {mapData.maps.slice(mapOffset, mapOffset + PAGE_SIZE).map((map) => (
                      <button
                        key={map.mapId}
                        type="button"
                        disabled={!map.isActive}
                        onClick={() => setSelectedMapId(map.mapId)}
                        className={`flex flex-1 flex-col items-center gap-1 rounded border px-1 py-1.5 text-center transition-all ${
                          selectedMapId === map.mapId
                            ? 'border-[#217346] bg-[#d4eadd]'
                            : map.isActive
                              ? 'border-gray-200 bg-white hover:border-[#217346] hover:bg-[#f0f7f3]'
                              : 'border-gray-100 bg-gray-50 opacity-40'
                        } ${!map.isActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`text-xs font-medium leading-tight ${
                            selectedMapId === map.mapId ? 'text-[#175c35]' : 'text-gray-700'
                          }`}
                        >
                          {map.mapName}
                        </span>
                        <div className="flex gap-px">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${
                                i < map.difficulty ? 'text-yellow-500' : 'text-gray-200'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapOffset((o) => o + 1)}
                    disabled={mapOffset + PAGE_SIZE >= mapData.maps.length}
                    className="flex h-14 w-6 shrink-0 items-center justify-center rounded border border-gray-300 text-base font-bold text-gray-500 transition-all hover:border-[#217346] hover:text-[#217346] disabled:cursor-default disabled:border-gray-100 disabled:text-gray-200"
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Password toggle */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-md font-medium text-gray-700">비밀번호 설정</label>
              <button
                type="button"
                onClick={() => setHasPassword((prev) => !prev)}
                className={`relative h-5 w-9 !rounded-full border-none transition-colors ${
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
              <label className="flex items-center gap-1 text-md font-medium text-gray-700">
                비밀번호 <span className="text-xs text-red-500">*필수</span>
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

          {error && <p className="text-xs text-red-500">{error}</p>}
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
