import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { useJoinRoom, useRoomByCode, useRooms } from '../hooks/useRoom';

import CreateRoomModal from './modals/CreateRoomModal';
import PasswordModal from './modals/PasswordModal';

import type { GameMode, RoomSummary } from '../types/room.types';

const MODE_LABELS: Record<GameMode, string> = {
  CONTRIBUTION_RUN: '기여도 뺏기',
  TIME_ATTACK: '타임어택',
  COOP: '협력',
};

const MODE_SHORT: Record<GameMode, string> = {
  CONTRIBUTION_RUN: 'CONTRIB',
  TIME_ATTACK: 'TIME',
  COOP: 'COOP',
};

interface LobbyPageProps {
  mode: GameMode;
  onClose: () => void;
}

/**
 * 방 목록 로비 — Win11 Excel 스타일 모달 창
 *
 * @description 모드별 방 목록 조회 / 방 생성 / 방 코드 입장을 제공한다.
 * 홈 바탑화면 위에 모달로 렌더링되며, /multi 라우트에서도 래퍼를 통해 사용된다.
 */
export default function LobbyPage({ mode: initialMode, onClose }: LobbyPageProps) {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState<GameMode>(initialMode);

  const { data, isLoading, refetch } = useRooms(currentMode);
  const rooms: RoomSummary[] = data?.rooms ?? [];

  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passwordRoomId, setPasswordRoomId] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const { mutate: findByCode, isPending: isFindingCode } = useRoomByCode();
  const { mutate: joinRoom, isPending: isJoining } = useJoinRoom();

  const goToRoom = (roomId: number) => {
    void navigate({ to: '/multi/$roomId', params: { roomId: String(roomId) } });
  };

  const handleJoin = (room: RoomSummary) => {
    if (room.status === 'IN_GAME') return;
    if (room.hasPassword) {
      setPasswordRoomId(room.roomId);
    } else {
      joinRoom(room.roomId, { onSuccess: () => goToRoom(room.roomId) });
    }
  };

  const handleCodeJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) {
      setCodeError('방 코드를 입력하세요.');
      return;
    }
    if (trimmed.length !== 6) {
      setCodeError('방 코드는 6자리입니다.');
      return;
    }
    setCodeError('');

    findByCode(trimmed, {
      onSuccess: (room) => {
        if (room.status === 'IN_GAME') {
          setCodeError('이미 게임 중인 방입니다.');
          return;
        }
        if (room.hasPassword) {
          setPasswordRoomId(room.roomId);
        } else {
          joinRoom(room.roomId, { onSuccess: () => goToRoom(room.roomId) });
        }
      },
      onError: () => setCodeError('존재하지 않는 방 코드입니다.'),
    });
  };

  return (
    <>
      {/* 모달 오버레이 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="게임 로비"
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Excel */}
        <div className="relative z-10 flex h-160 w-full max-w-245 flex-col overflow-hidden rounded-lg bg-[#f0f0f0] shadow-2xl ring-1 ring-black/10 select-none">
          {/* Title bar */}
          <div className="flex h-9 items-center gap-2 bg-[#217346] px-3">
            <span className="text-sm text-white/60">📊</span>
            <span className="flex-1 text-sm font-medium text-white">
              게임방목록.xlsx — Git Git 코리언
            </span>
            <div className="flex">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-white/15"
                title="최소화"
              >
                ―
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-red-500 hover:text-white"
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Menu bar */}
          <div className="flex bg-[#217346] px-1.5">
            {['홈', '삽입', '페이지 레이아웃', '수식', '데이터', '검토', '보기'].map((item) => (
              <span
                key={item}
                className={`cursor-pointer rounded-sm px-3 py-1 text-sm ${
                  item === '홈'
                    ? 'bg-white font-medium text-[#217346]'
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                {item}
              </span>
            ))}
          </div>

          {/* Ribbon */}
          <div className="flex items-center gap-2.5 border-b border-gray-300 bg-[#f0f0f0] px-3 py-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded border border-[#175c35] bg-[#217346] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#175c35]"
            >
              <span>+</span> 방 만들기
            </button>

            <div className="mx-1 h-7 w-px bg-gray-300" />

            {/* Room code input */}
            <form onSubmit={handleCodeJoin} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">방 코드:</span>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                placeholder="A1B2C3"
                maxLength={6}
                className="h-8 w-24 rounded-l border border-r-0 border-gray-300 px-2 font-mono text-sm tracking-widest text-[#217346] outline-none focus:border-[#217346]"
              />
              <button
                type="submit"
                disabled={isFindingCode || isJoining}
                className="h-8 rounded-r border border-[#175c35] bg-[#217346] px-3 text-sm text-white hover:bg-[#175c35] disabled:cursor-not-allowed disabled:opacity-60"
              >
                입장
              </button>
            </form>

            {codeError && <span className="text-xs text-red-500">{codeError}</span>}

            {/* Refresh */}
            <button
              type="button"
              onClick={() => void refetch()}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded text-base text-gray-500 hover:bg-gray-200"
              title="새로 고침"
            >
              ↺
            </button>
          </div>

          {/* Formula bar */}
          <div className="flex h-8 items-center gap-2 border-b border-gray-300 bg-white px-2.5">
            <input
              readOnly
              value={selectedRoom ? `B${rooms.indexOf(selectedRoom) + 2}` : 'B1'}
              className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs text-gray-600 outline-none"
            />
            <span className="text-sm font-bold italic text-[#217346]">fx</span>
            <span className="flex-1 font-mono text-xs text-[#175c35]">
              {selectedRoom ? `"${selectedRoom.title}"` : `MODE="${currentMode}"`}
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar */}
            <div className="flex w-36 shrink-0 flex-col border-r border-gray-300 bg-[#f9f9f9]">
              <div className="flex items-center gap-1 border-b border-gray-300 bg-[#e8f5ee] px-2 py-1.5">
                <span className="text-xs font-medium text-[#175c35]">📁 방목록</span>
              </div>
              {(['CONTRIBUTION_RUN', 'TIME_ATTACK', 'COOP'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCurrentMode(m);
                    setSelectedRoom(null);
                  }}
                  className={`flex flex-col gap-0.5 border-b border-gray-100/70 px-3 py-2 text-left transition-colors hover:bg-[#f0f7f3] ${
                    currentMode === m ? 'border-l-[3px] border-l-[#217346] bg-[#d4eadd]' : ''
                  }`}
                >
                  <span
                    className={`text-sm ${currentMode === m ? 'font-medium text-[#175c35]' : 'text-gray-600'}`}
                  >
                    {MODE_LABELS[m]}
                  </span>
                  <span
                    className={`font-mono text-[10px] ${currentMode === m ? 'text-[#3b7a57]' : 'text-gray-400'}`}
                  >
                    {m}
                  </span>
                </button>
              ))}
            </div>

            {/* Room list table */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-white">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    불러오는 중...
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                    <span className="text-3xl">📭</span>
                    <span className="text-sm">방이 없습니다. 첫 번째로 만들어보세요!</span>
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 w-8 border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 text-center text-xs font-medium text-[#175c35]">
                          #
                        </th>
                        <th className="sticky top-0 z-10 border border-[#c8dfd0] bg-[#e8f5ee] px-2.5 py-1.5 text-left text-xs font-medium text-[#175c35]">
                          방 제목
                        </th>
                        <th className="sticky top-0 z-10 w-24 border border-[#c8dfd0] bg-[#e8f5ee] px-2.5 py-1.5 text-center text-xs font-medium text-[#175c35]">
                          모드
                        </th>
                        <th className="sticky top-0 z-10 w-20 border border-[#c8dfd0] bg-[#e8f5ee] px-2.5 py-1.5 text-center text-xs font-medium text-[#175c35]">
                          인원
                        </th>
                        <th className="sticky top-0 z-10 w-24 border border-[#c8dfd0] bg-[#e8f5ee] px-2.5 py-1.5 text-center text-xs font-medium text-[#175c35]">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room, idx) => (
                        <tr
                          key={room.roomId}
                          onClick={() => setSelectedRoom(room)}
                          onDoubleClick={() => handleJoin(room)}
                          className={`cursor-pointer transition-colors ${
                            selectedRoom?.roomId === room.roomId
                              ? 'bg-[#d4eadd]'
                              : 'hover:bg-[#f0f7f3]'
                          }`}
                        >
                          <td className="border border-[#e4ede8] bg-[#f0f7f3] py-2 text-center text-xs text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="overflow-hidden text-ellipsis whitespace-nowrap border border-[#e4ede8] px-2.5 py-2 text-sm text-gray-800">
                            {room.hasPassword && (
                              <span className="mr-1 text-xs text-gray-400">🔒</span>
                            )}
                            {room.title}
                          </td>
                          <td className="border border-[#e4ede8] px-2.5 py-2 text-center font-mono text-xs text-gray-600">
                            {MODE_SHORT[room.mode] ?? room.mode}
                          </td>
                          <td className="border border-[#e4ede8] px-2.5 py-2 text-center text-sm text-gray-700">
                            {room.currentPlayers}/{room.maxPlayers}
                          </td>
                          <td className="border border-[#e4ede8] px-2.5 py-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                                room.status === 'WAITING'
                                  ? 'bg-[#e8f5e9] text-[#1b5e20]'
                                  : 'bg-[#f3e5f5] text-[#4a148c]'
                              }`}
                            >
                              {room.status === 'WAITING' ? '대기 중' : '게임 중'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right detail panel */}
            <div className="flex w-52 shrink-0 flex-col border-l border-gray-300 bg-[#f8fff9]">
              <div className="flex items-center gap-1.5 bg-[#217346] px-3 py-2">
                <span className="text-sm font-medium text-white">선택된 방 세부 정보</span>
              </div>

              {selectedRoom ? (
                <>
                  <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">roomId</span>
                      <span className="text-sm font-medium text-gray-800">
                        #{selectedRoom.roomId}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">title</span>
                      <span className="wrap-break-word text-sm font-medium text-gray-800">
                        {selectedRoom.title}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">mode</span>
                      <span className="text-sm font-medium text-gray-800">
                        {MODE_LABELS[selectedRoom.mode]}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">players</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedRoom.currentPlayers} / {selectedRoom.maxPlayers}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">status</span>
                      <span
                        className={`inline-flex w-fit items-center rounded px-2 py-0.5 text-xs ${
                          selectedRoom.status === 'WAITING'
                            ? 'bg-[#e8f5e9] text-[#1b5e20]'
                            : 'bg-[#f3e5f5] text-[#4a148c]'
                        }`}
                      >
                        {selectedRoom.status === 'WAITING' ? '대기 중' : '게임 중'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] text-gray-400">hasPassword</span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedRoom.hasPassword ? '🔒 비밀방' : '🔓 공개방'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 p-2.5">
                    <button
                      type="button"
                      onClick={() => handleJoin(selectedRoom)}
                      disabled={selectedRoom.status === 'IN_GAME' || isJoining}
                      className="flex w-full items-center justify-center gap-1 rounded border border-[#175c35] bg-[#217346] py-2 text-sm font-medium text-white transition-colors hover:bg-[#175c35] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400"
                    >
                      {selectedRoom.status === 'IN_GAME'
                        ? '게임 중'
                        : isJoining
                          ? '입장 중...'
                          : '▶ 입장'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-12 px-4 text-center text-sm leading-relaxed text-gray-400">
                  방을 선택하면
                  <br />
                  세부 정보가
                  <br />
                  표시됩니다.
                </p>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-4 bg-[#217346] px-3 py-1.5 text-xs text-white/90">
            <span>총 {rooms.length}개 방</span>
            <span className="text-white/30">|</span>
            <span>모드: {MODE_LABELS[currentMode]}</span>
            {selectedRoom && (
              <>
                <span className="text-white/30">|</span>
                <span>1개 선택됨</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 하위 모달 (로비 오버레이 위에 렌더링) */}
      {showCreateModal && (
        <CreateRoomModal
          defaultMode={currentMode}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(roomId) => goToRoom(roomId)}
        />
      )}

      {passwordRoomId !== null && (
        <PasswordModal
          roomId={passwordRoomId}
          onClose={() => setPasswordRoomId(null)}
          onSuccess={(roomId) => goToRoom(roomId)}
        />
      )}
    </>
  );
}
