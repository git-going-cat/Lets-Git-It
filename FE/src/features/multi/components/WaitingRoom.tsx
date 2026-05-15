import { useCallback, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Check, Copy, Gamepad2, LockKeyhole, LogOut, Play, Settings, Users } from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/authStore';
import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useModal } from '@/shared/hooks/useModal';

import { useCopyRoomCode } from '../hooks/useCopyRoomCode';
import { useLeaveRoom } from '../hooks/useLeaveRoom';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { useRoomStore } from '../store/roomStore';

import { EditRoomModal } from './modals/EditRoomModal';

import type { RoomMember } from '../types/room.types';
import type { CharacterAsset } from '@/shared/components/AnimatedCharacter';

const MODE_LABELS: Record<string, string> = { CONTRIBUTION: '기여도 뺏기', COOP: '협력' };

function toAsset(m: RoomMember): CharacterAsset {
  return {
    characterHair: m.characterHair,
    characterHairColor: m.characterHairColor,
    characterBody: m.characterBody,
    characterEye: m.characterEye,
    characterOutfit: m.characterOutfit,
    characterOutfitColor: m.characterOutfitColor,
  };
}

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const HATCHED = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #e8f5ee 0, #e8f5ee 3px, #f8fff9 3px, #f8fff9 9px)',
};

interface MembersSpreadsheetProps {
  slots: (RoomMember | null)[];
  myNickname: string | undefined;
}

function MembersSpreadsheet({ slots, myNickname }: MembersSpreadsheetProps) {
  return (
    <div className="h-full overflow-auto select-none bg-white">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-7" />
          {slots.map((_, i) => (
            <col key={i} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-7">
            <th className="border border-[#c8dfd0] bg-[#e8f5ee]" />
            {slots.map((_, i) => (
              <th
                key={i}
                className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm font-semibold text-[#175c35]"
              >
                {COL_LETTERS[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="min-h-48">
          {/* Row 1: Badges */}
          <tr className="h-8">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              1
            </td>
            {slots.map((member, i) => (
              <td
                key={i}
                className="border border-[#c8dfd0] px-1 py-1"
                style={!member ? HATCHED : {}}
              >
                {member && (
                  <div className="flex flex-wrap gap-0.5">
                    {member.isHost && (
                      <span className="rounded-sm bg-amber-400 px-1 text-md font-bold leading-4 text-amber-900">
                        HOST
                      </span>
                    )}
                    {member.nickname === myNickname && (
                      <span className="rounded-sm bg-[#217346] px-1 text-md font-bold leading-4 text-white">
                        ME
                      </span>
                    )}
                    <span
                      className={`rounded-sm px-1 text-md font-bold leading-4 ${
                        member.isHost || member.isReady
                          ? 'bg-[#e8f5e9] text-[#1b5e20]'
                          : 'bg-[#fce4ec] text-[#880e4f]'
                      }`}
                    >
                      {member.isHost || member.isReady ? 'READY' : 'WAIT'}
                    </span>
                  </div>
                )}
              </td>
            ))}
          </tr>

          {/* Row 2: Character */}
          <tr className="h-45">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              2
            </td>
            {slots.map((member, i) => (
              <td
                key={i}
                className={`border border-[#c8dfd0] text-center ${member ? 'bg-white' : ''}`}
                style={!member ? HATCHED : {}}
              >
                {member ? (
                  <AnimatedCharacter
                    asset={toAsset(member)}
                    animation="idle"
                    direction="front"
                    className="mx-auto h-24 w-12"
                  />
                ) : (
                  <span className="font-mono text-md font-medium text-[#a8c5b0]">EMPTY</span>
                )}
              </td>
            ))}
          </tr>

          {/* Row 3: Nickname */}
          <tr className="h-7">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              3
            </td>
            {slots.map((member, i) => (
              <td key={i} className="border border-[#c8dfd0] p-0" style={!member ? HATCHED : {}}>
                {member && (
                  <div className="flex h-full divide-x divide-[#c8dfd0]">
                    <span className="flex w-9 shrink-0 items-center justify-center bg-[#e8f5ee] font-mono text-md text-[#3b7a57]">
                      nick
                    </span>
                    <span className="flex flex-1 items-center overflow-hidden px-1.5 text-md font-medium text-gray-800">
                      {member.nickname}
                    </span>
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function WaitingRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams({ from: '/multi/$roomId' });
  const numericRoomId = Number(roomId);

  const title = useRoomStore((s) => s.title);
  const roomCode = useRoomStore((s) => s.roomCode);
  const mode = useRoomStore((s) => s.mode);
  const members = useRoomStore((s) => s.members);
  const maxPlayers = useRoomStore((s) => s.maxPlayers);
  const teamName = useRoomStore((s) => s.teamName);
  const selectedMap = useRoomStore((s) => s.selectedMap);
  const reset = useRoomStore((s) => s.reset);

  const [showEditModal, setShowEditModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleReconnectComplete = useCallback(
    (restoredRoomState: string | null) => {
      if (restoredRoomState === 'IN_GAME') {
        const currentMode = useRoomStore.getState().mode;
        reset();
        void navigate({ to: '/home', search: { lobby: currentMode ?? 'CONTRIBUTION' } });
      } else if (restoredRoomState === null) {
        // REST fallback 실패 — 에러 첨 표시 후 로비로 안내
        setRestoreError(true);
      }
    },
    [navigate, reset]
  );

  const { publishReady, publishStart, connectionStatus } = useRoomSocket(
    numericRoomId,
    handleReconnectComplete
  );

  const myNickname = useAuthStore((s) => s.user?.nickname);
  const me = members.find((m) => m.nickname === myNickname);
  const isHost = me?.isHost ?? false;

  const nonHostMembers = members.filter((m) => !m.isHost);
  const readyCount = nonHostMembers.filter((m) => m.isReady).length;
  const allReady = nonHostMembers.length > 0 && readyCount === nonHostMembers.length;

  const { copied, handleCopyCode } = useCopyRoomCode(roomCode);

  const { handleLeave } = useLeaveRoom({ roomId: numericRoomId, mode, reset, navigate });

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveConfirm(false);
    handleLeave();
  }, [handleLeave]);

  // B. 외부 dialog는 편집 모달·confirm·에러 오버레이가 없을 때만 ESC/focus trap 활성화
  const { containerRef: dialogRef } = useModal({
    isOpen: !showEditModal && !showLeaveConfirm && !restoreError,
    onClose: () => setShowLeaveConfirm(true),
  });

  // confirm 모달 — 자체 focus trap
  const { containerRef: leaveConfirmRef } = useModal({
    isOpen: showLeaveConfirm,
    onClose: () => setShowLeaveConfirm(false),
  });

  // C. restoreError가 활성화된 동안 confirm을 열지 않도록 backdrop/버튼 가드
  const requestLeaveConfirm = useCallback(() => {
    if (restoreError) return;
    setShowLeaveConfirm(true);
  }, [restoreError]);

  const modeLabel = mode ? (MODE_LABELS[mode] ?? mode) : '';

  const slots: (RoomMember | null)[] = [
    ...members,
    ...Array<null>(Math.max(0, maxPlayers - members.length)).fill(null),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={requestLeaveConfirm} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? '대기실'}
        tabIndex={-1}
        className={`relative z-10 flex select-none flex-col overflow-hidden rounded-lg bg-[#f0f0f0] shadow-2xl ring-1 ring-black/10 ${
          isMaximized ? 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]' : 'h-160 w-full max-w-245'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* blocking 오버레이: 페이지 새로고침 또는 10초+ 단절 */}
        {connectionStatus === 'blocking' && !restoreError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#217346] border-t-transparent" />
              <p className="text-sm font-medium text-[#217346]">대기실에 재접속 중...</p>
              <p className="text-xs text-gray-400">연결이 복원될 때까지 잠시 기다려 주세요.</p>
            </div>
          </div>
        )}

        {/* REST fallback 실패 오버레이 */}
        {restoreError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-medium text-red-600">방 정보를 불러올 수 없습니다.</p>
              <p className="text-xs text-gray-400">네트워크 상태를 확인하고 다시 시도해 주세요.</p>
              <button
                type="button"
                onClick={() => {
                  const currentMode = useRoomStore.getState().mode;
                  reset();
                  void navigate({ to: '/home', search: { lobby: currentMode ?? 'CONTRIBUTION' } });
                }}
                className="rounded border border-[#175c35] bg-[#217346] px-4 py-2 text-sm font-medium text-white hover:bg-[#175c35]"
              >
                로비로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* 네트워크 단절 배너 */}
        {(connectionStatus === 'disconnected' || connectionStatus === 'reconnected') && (
          <div
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors ${
              connectionStatus === 'reconnected'
                ? 'bg-[#e8f5e9] text-[#1b5e20]'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {connectionStatus === 'reconnected' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#43a047]" />
                연결이 복원되었습니다.
              </>
            ) : (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                연결이 끊겼습니다. 재연결 중...
              </>
            )}
          </div>
        )}

        {/* Title Bar */}
        <div className="flex h-9 items-center gap-2 bg-[#217346] px-3">
          <Gamepad2 className="h-4 w-4 text-white/60" />
          <span className="flex-1 text-sm font-medium text-white">
            대기실 — {title ?? '로딩 중...'}
          </span>
          <div className="flex">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-white/15"
              title={isMaximized ? '이전 크기로 복원' : '최대화'}
            >
              {isMaximized ? (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4.5 4.5V2.5H9.5V7.5H7.5" stroke="currentColor" strokeWidth="1" />
                  <rect
                    x="2.5"
                    y="4.5"
                    width="5"
                    height="5"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="transparent"
                  />
                </svg>
              ) : (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2.5"
                    y="2.5"
                    width="7"
                    height="7"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={requestLeaveConfirm}
              aria-label="방 나가기"
              className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-red-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="flex bg-[#217346] px-1.5">
          {['홈', '삽입', '페이지 레이아웃', '수식', '데이터', '검토', '보기'].map((item) => (
            <span
              key={item}
              className={`cursor-pointer rounded-t-sm px-3 py-1 text-sm ${
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
          {isHost && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded border border-[#175c35] bg-[#217346] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#175c35]"
            >
              <Settings className="h-3.5 w-3.5" />방 수정
            </button>
          )}
          <button
            type="button"
            onClick={requestLeaveConfirm}
            className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />방 나가기
          </button>

          <div className="mx-1 h-7 w-px bg-gray-300" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">GAME_CODE:</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 rounded border border-[#175c35] bg-[#e8f5ee] px-2.5 py-1 font-mono text-sm font-semibold text-[#175c35] transition-colors hover:bg-[#d4eadd]"
            >
              {roomCode ?? '------'}
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <LockKeyhole className="h-3.5 w-3.5" />
            <span>비밀방</span>
          </div>
        </div>

        {/* Formula Bar */}
        <div className="flex h-8 items-center gap-2 border-b border-gray-300 bg-white px-2.5">
          <input
            readOnly
            value={`A${numericRoomId}`}
            className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs text-gray-600 outline-none"
          />
          <span className="text-sm font-bold italic text-[#217346]">fx</span>
          <span className="flex-1 font-mono text-xs text-[#175c35]">
            {`=WAITING_ROOM(roomId=${numericRoomId}, mode="${modeLabel}", state="WAITING")`}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Members + Chat */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-1.5 border-b border-[#c8dfd0] bg-[#e8f5ee] px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-[#175c35]" />
              <span className="text-md font-medium text-[#175c35]">MEMBERS</span>
              <span className="ml-auto font-mono text-md text-[#3b7a57]">
                {members.length} / {maxPlayers}
              </span>
            </div>

            <div className="shrink-0">
              <MembersSpreadsheet slots={slots} myNickname={myNickname ?? undefined} />
            </div>

            {/* Chat terminal */}
            <div className="flex flex-1 flex-col border-t border-[#c8dfd0]">
              <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-700 bg-[#1a1a1a] px-3 py-1">
                <span className="font-mono text-md font-bold uppercase tracking-wider text-green-400">
                  CHAT_TERMINAL
                </span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#0d0d0d] px-3 py-2 font-mono text-md">
                <p className="text-[#217346]">[SYSTEM] 대기실에 입장했습니다.</p>
                <p className="text-gray-500">[SYSTEM] 방 코드를 공유하여 친구를 초대하세요.</p>
              </div>
              <div className="flex shrink-0 items-center border-t border-gray-700 bg-[#1a1a1a] px-2 py-1">
                <span className="mr-1 font-mono text-md text-green-400">{'>'}</span>
                <input
                  type="text"
                  className="flex-1 bg-transparent font-mono text-md text-green-400 outline-none placeholder:text-gray-600"
                  placeholder="채팅 입력..."
                />
              </div>
            </div>
          </div>

          {/* Right: Room Info */}
          <div className="flex w-1/4 shrink-0 flex-col border-l border-gray-300">
            <div className="flex items-center gap-1.5 bg-[#217346] px-3 py-2">
              <span className="text-md font-medium text-white">ROOM_INFO</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-md">
                <colgroup>
                  <col className="w-[48%]" />
                  <col />
                </colgroup>
                <tbody className="min-h-10">
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-3 font-mono text-[#3b7a57]">
                      roomId
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5 font-medium text-gray-800">
                      {numericRoomId}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      roomCode
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5">
                      <span className="font-mono font-bold tracking-widest text-[#175c35]">
                        {roomCode ?? '-'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      title
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5 font-medium text-gray-800 break-all">
                      {title ?? '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      mode
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5">
                      <span className="rounded bg-[#217346] px-1.5 py-0.5 font-mono text-md font-bold text-white">
                        {mode ?? '-'}
                      </span>
                    </td>
                  </tr>
                  {mode === 'COOP' && (
                    <tr>
                      <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                        teamName
                      </td>
                      <td className="border border-[#c8dfd0] bg-white px-2 py-1.5 font-medium text-gray-800">
                        {teamName ?? '-'}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      roomState
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5">
                      <span className="rounded bg-[#e8f5e9] px-1.5 py-0.5 font-mono text-md font-bold text-[#1b5e20]">
                        WAITING
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      currentPlayers
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5 font-medium text-gray-800">
                      {members.length} / {maxPlayers}
                    </td>
                  </tr>
                  {mode === 'COOP' && selectedMap && (
                    <tr>
                      <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                        selectedMap
                      </td>
                      <td className="border border-[#c8dfd0] bg-white px-2 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-800">{selectedMap.mapName}</span>
                          <span className="text-amber-400">
                            {'★'.repeat(Math.min(selectedMap.difficulty, 3))}
                            {'☆'.repeat(Math.max(0, 3 - selectedMap.difficulty))}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-300 p-2.5">
              {isHost ? (
                <button
                  type="button"
                  onClick={publishStart}
                  disabled={!allReady}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[#175c35] bg-[#217346] py-2 text-sm font-medium text-white transition-colors hover:bg-[#175c35] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400"
                >
                  {allReady ? <Play className="h-4 w-4 text-white" /> : '⏳ 대기 중...'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={publishReady}
                  className={`flex w-full items-center justify-center gap-1 rounded border py-2 text-sm font-medium transition-colors ${
                    me?.isReady
                      ? 'border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'border-[#175c35] bg-[#217346] text-white hover:bg-[#175c35]'
                  }`}
                >
                  {me?.isReady ? '준비 취소' : '준비 완료'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 bg-[#217346] px-3 py-1.5 text-xs text-white/90">
          <span>모드: {modeLabel}</span>
          <span className="text-white/30">|</span>
          <span>
            준비: {readyCount} / {nonHostMembers.length}
          </span>
          {selectedMap && (
            <>
              <span className="text-white/30">|</span>
              <span>맵: {selectedMap.mapName}</span>
            </>
          )}
          <span className="ml-auto text-white/60">ROOM #{numericRoomId}</span>
        </div>

        {/* Edit Room Modal */}
        <EditRoomModal
          isOpen={showEditModal && isHost}
          onClose={() => setShowEditModal(false)}
          title={title}
          mode={mode}
          teamName={teamName}
        />

        {/* Leave Confirm Modal */}
        {showLeaveConfirm && (
          <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40">
            <div
              ref={leaveConfirmRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-confirm-title"
              tabIndex={-1}
              className="flex flex-col gap-4 rounded-lg bg-white p-6 shadow-2xl ring-1 ring-black/10 w-80"
            >
              <h2 id="leave-confirm-title" className="text-base font-semibold text-gray-800">
                방에서 나가겠습니까?
              </h2>
              <p className="text-sm text-gray-500">대기실에서 나가면 로비로 돌아갑니다.</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleLeaveConfirm}
                  className="rounded border border-red-500 bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
