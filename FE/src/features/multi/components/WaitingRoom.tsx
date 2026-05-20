import { useCallback, useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Check, Copy, Gamepad2, LockKeyhole, LogOut, Settings, Users } from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useContributionStore } from '@/features/contribution/store/contributionStore';
import { useCoopStore } from '@/features/coop/store/coopStore';
import { useModal } from '@/shared/hooks/useModal';

import { useCopyRoomCode } from '../hooks/useCopyRoomCode';
import { useLeaveRoom } from '../hooks/useLeaveRoom';
import { useKickRoomMember } from '../hooks/useRoom';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { useRoomStore } from '../store/roomStore';

import { MembersSpreadsheet } from './MembersSpreadsheet';
import { ConfirmModal } from './modals/ConfirmModal';
import { EditRoomModal } from './modals/EditRoomModal';
import { WaitingRoomChat } from './WaitingRoomChat';

import type { ContributionStartedMessage, CoopStartedMessage } from '../schemas/room.schema';
import type { RoomMember } from '../types/room.types';

const MODE_LABELS: Record<string, string> = { CONTRIBUTION: '기여도 뺏기', COOP: '협력' };

type MemberAction = 'kick' | 'transfer';

type PendingMemberAction = {
  type: MemberAction;
  member: RoomMember;
};

function getMemberActionErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: { code?: string; message?: string } } })
    .response?.data;

  switch (responseData?.code) {
    case 'NOT_HOST':
      return '방장만 수행할 수 있습니다.';
    case 'PLAYER_NOT_FOUND':
      return '해당 플레이어를 찾을 수 없습니다.';
    case 'CANNOT_KICK_SELF':
      return '자기 자신은 추방할 수 없습니다.';
    case 'ROOM_IN_GAME':
      return '이미 게임 중인 방입니다.';
    case 'ROOM_NOT_FOUND':
      return '존재하지 않는 방입니다.';
    default:
      return responseData?.message ?? '멤버 작업에 실패했습니다. 다시 시도해 주세요.';
  }
}

export default function WaitingRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams({ from: '/multi/$roomId' });
  const { fromGameResult } = useSearch({ from: '/multi/$roomId' });
  const numericRoomId = Number(roomId);

  const title = useRoomStore((s) => s.title);
  const roomCode = useRoomStore((s) => s.roomCode);
  const mode = useRoomStore((s) => s.mode);
  const hasPassword = useRoomStore((s) => s.hasPassword);
  const members = useRoomStore((s) => s.members);
  const maxPlayers = useRoomStore((s) => s.maxPlayers);
  const allReady = useRoomStore((s) => s.allReady);
  const teamName = useRoomStore((s) => s.teamName);
  const selectedMap = useRoomStore((s) => s.selectedMap);
  const reset = useRoomStore((s) => s.reset);

  const [showEditModal, setShowEditModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);
  const [openMemberActionId, setOpenMemberActionId] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<PendingMemberAction | null>(null);
  const { mutate: kickRoomMember } = useKickRoomMember();

  const handleReconnectComplete = useCallback(
    (restoredRoomState: string | null) => {
      if (restoredRoomState === 'IN_GAME') {
        if (fromGameResult) return;

        const currentMode = useRoomStore.getState().mode;
        reset();
        void navigate({ to: '/home', search: { lobby: currentMode ?? 'CONTRIBUTION' } });
      } else if (restoredRoomState === null) {
        // REST fallback 실패 — 에러 표시 후 로비로 안내
        setRestoreError(true);
      }
    },
    [fromGameResult, navigate, reset]
  );

  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleForceDisconnect = useCallback(() => {
    reset();
    clearAuth();
    void navigate({ to: '/login' });
  }, [clearAuth, navigate, reset]);

  const handleKicked = useCallback(() => {
    const currentMode = useRoomStore.getState().mode;
    reset();
    void navigate({ to: '/home', search: { lobby: currentMode ?? 'CONTRIBUTION' } });
  }, [navigate, reset]);

  const handlePrivateError = useCallback((_code: string, message: string) => {
    setPrivateError(message);
  }, []);

  const handleContributionStarted = useCallback(
    (message: ContributionStartedMessage) => {
      const currentMembers = useRoomStore.getState().members;
      const { user } = useAuthStore.getState();
      const myMemberId = user?.memberId;
      const myNickname = user?.nickname;
      const myPlayerId =
        (myMemberId &&
          message.players.find((player) => player.playerId === myMemberId)?.playerId) ||
        (myMemberId && currentMembers.find((member) => member.playerId === myMemberId)?.playerId) ||
        currentMembers.find((member) => member.nickname === myNickname)?.playerId ||
        null;

      if (!myPlayerId) {
        console.error('[WaitingRoom] CONTRIBUTION_STARTED 처리 실패: 플레이어 ID를 찾을 수 없음');
        return;
      }

      const branches = [
        ...new Set([
          message.initialBranch,
          ...message.commandSet.map((command) => command.branchName),
        ]),
      ];
      useContributionStore.getState().setSession({
        sessionId: message.gameSessionId,
        roomId: numericRoomId,
        myPlayerId,
        serverTime: message.serverTime,
        startAt: message.startAt,
        clientStartAt: Date.now() + (message.startAt - message.serverTime),
        commandSet: message.commandSet,
        branches,
        players: message.players.map((player) => {
          const member = currentMembers.find((m) => m.playerId === player.playerId);
          return {
            playerId: player.playerId,
            nickname: player.nickname,
            currentBranch: message.initialBranch,
            characterHair: member?.characterHair ?? '',
            characterHairColor: member?.characterHairColor ?? '',
            characterBody: member?.characterBody ?? '',
            characterEye: member?.characterEye ?? '',
            characterOutfit: member?.characterOutfit ?? '',
            characterOutfitColor: member?.characterOutfitColor ?? '',
          };
        }),
      });

      reset();
      void navigate({ to: '/contribution' });
    },
    [navigate, numericRoomId, reset]
  );

  const handleCoopStarted = useCallback(
    (message: CoopStartedMessage) => {
      const currentMembers = useRoomStore.getState().members;
      const { user } = useAuthStore.getState();
      const myMemberId = user?.memberId;
      const myNickname = user?.nickname;

      const players = message.players.slice(0, 4).map((player, index) => {
        const member = currentMembers.find(
          (item) => item.playerId === player.playerId || item.nickname === player.nickname
        );

        return {
          playerId: player.playerId,
          nickname: player.nickname,
          isMe:
            myMemberId != null
              ? player.playerId === myMemberId || member?.playerId === myMemberId
              : myNickname != null &&
                (player.nickname === myNickname || member?.nickname === myNickname),
          commandOrder: index + 1,
          characterHair: member?.characterHair ?? '',
          characterHairColor: member?.characterHairColor ?? '',
          characterBody: member?.characterBody ?? '',
          characterBodyColor: 'Body-color_01',
          characterEye: member?.characterEye ?? '',
          characterOutfit: member?.characterOutfit ?? '',
          characterOutfitColor: member?.characterOutfitColor ?? '',
        };
      });

      useCoopStore.getState().setSessionMeta({
        sessionId: message.gameSessionId,
        roomId: numericRoomId,
        mapName: useRoomStore.getState().selectedMap?.mapName ?? null,
        startKey: message.startAt,
        startAt: message.startAt + (Date.now() - message.serverTime),
        startDelayMs: Math.max(0, message.startAt - message.serverTime),
      });
      useCoopStore.getState().setPlayerSnapshots(players);
      useCoopStore.getState().setGameSessionId(message.gameSessionId);
      useCoopStore.getState().setTotalRounds(message.totalRounds ?? 5);
      useCoopStore.getState().setGraphData(message.graphData ?? null);
      reset();
      void navigate({ to: '/coop' });
    },
    [navigate, numericRoomId, reset]
  );

  const { publishReady, publishStart, publishHostTransfer, publishChat, connectionStatus } =
    useRoomSocket(
      numericRoomId,
      mode,
      handleReconnectComplete,
      {
        onForceDisconnect: handleForceDisconnect,
        onKicked: handleKicked,
        onPrivateError: handlePrivateError,
      },
      {
        onContributionStarted: handleContributionStarted,
        onCoopStarted: handleCoopStarted,
      }
    );

  const myMemberId = useAuthStore((s) => s.user?.memberId);
  const myNickname = useAuthStore((s) => s.user?.nickname);
  const me =
    members.find((member) => member.playerId === myMemberId) ??
    members.find((member) => member.nickname === myNickname);
  const myPlayerId = me?.playerId;
  const isHost = me?.isHost ?? false;

  const nonHostMembers = members.filter((m) => !m.isHost);
  const readyCount = nonHostMembers.filter((m) => m.isReady).length;

  const { copied, handleCopyCode } = useCopyRoomCode(roomCode);

  const { handleLeave } = useLeaveRoom({ roomId: numericRoomId, mode, reset, navigate });

  const handleToggleMemberActions = useCallback((playerId: string) => {
    setOpenMemberActionId((current) => (current === playerId ? null : playerId));
  }, []);

  const handleDialogClick = useCallback(() => {
    setOpenMemberActionId(null);
  }, []);

  const handleTransferHost = useCallback(
    (member: RoomMember) => {
      if (!isHost || member.playerId === myPlayerId) return;
      setOpenMemberActionId(null);
      setPendingMemberAction({ type: 'transfer', member });
    },
    [isHost, myPlayerId]
  );

  const handleKickMember = useCallback(
    (member: RoomMember) => {
      if (!isHost || member.playerId === myPlayerId) return;
      setOpenMemberActionId(null);
      setPendingMemberAction({ type: 'kick', member });
    },
    [isHost, myPlayerId]
  );

  const handleConfirmMemberAction = useCallback(() => {
    if (!pendingMemberAction) return;

    const { member, type } = pendingMemberAction;
    setPrivateError(null);
    setPendingMemberAction(null);

    if (type === 'transfer') {
      publishHostTransfer(member.playerId);
      return;
    }

    if (type === 'kick') {
      kickRoomMember(
        { roomId: numericRoomId, playerId: member.playerId },
        {
          onError: (error) => setPrivateError(getMemberActionErrorMessage(error)),
        }
      );
    }
  }, [kickRoomMember, numericRoomId, pendingMemberAction, publishHostTransfer]);

  const handleCancelMemberAction = useCallback(() => {
    setPendingMemberAction(null);
  }, []);

  const memberActionConfirmTitle =
    pendingMemberAction?.type === 'kick' ? '멤버를 추방하겠습니까?' : '방장을 위임하겠습니까?';

  const memberActionConfirmDescription =
    pendingMemberAction?.type === 'kick'
      ? `${pendingMemberAction.member.nickname} 님은 대기실에서 나가게 됩니다.`
      : `${pendingMemberAction?.member.nickname ?? ''} 님에게 방장 권한을 넘깁니다.`;

  const memberActionConfirmButtonLabel = pendingMemberAction?.type === 'kick' ? '추방' : '위임';

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveConfirm(false);
    handleLeave();
  }, [handleLeave]);

  // B. 외부 dialog는 편집 모달·confirm·에러 오버레이가 없을 때만 ESC/focus trap 활성화
  const { containerRef: dialogRef } = useModal({
    isOpen: !showEditModal && !showLeaveConfirm && !restoreError && !pendingMemberAction,
    onClose: () => setShowLeaveConfirm(true),
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
        onClick={(e) => {
          e.stopPropagation();
          handleDialogClick();
        }}
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

        {privateError && (
          <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700">
            <span>{privateError}</span>
            <button
              type="button"
              onClick={() => setPrivateError(null)}
              className="rounded px-1.5 text-red-500 hover:bg-red-100 hover:text-red-700"
              aria-label="에러 메시지 닫기"
            >
              ✕
            </button>
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
            {hasPassword && <LockKeyhole className="h-3.5 w-3.5" />}
            <span>{hasPassword ? '비밀방' : '공개방'}</span>
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
              <MembersSpreadsheet
                slots={slots}
                myPlayerId={myPlayerId}
                isHostView={isHost}
                openMemberActionId={openMemberActionId}
                onToggleMemberActions={handleToggleMemberActions}
                onKickMember={handleKickMember}
                onTransferHost={handleTransferHost}
              />
            </div>

            <WaitingRoomChat onSendMessage={publishChat} />
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
                  <tr>
                    <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-1.5 font-mono text-[#3b7a57]">
                      hasPassword
                    </td>
                    <td className="border border-[#c8dfd0] bg-white px-2 py-1.5 font-medium text-gray-800">
                      {hasPassword ? 'TRUE' : 'FALSE'}
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
                            {'★'.repeat(Math.min(selectedMap.difficulty, 5))}
                            {'☆'.repeat(Math.max(0, 5 - selectedMap.difficulty))}
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
                  onClick={() => {
                    setPrivateError(null);
                    publishStart();
                  }}
                  disabled={!allReady}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[#175c35] bg-[#217346] py-2 text-sm font-medium text-white transition-colors hover:bg-[#175c35] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400"
                >
                  {allReady ? '게임 시작' : '대기 중...'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPrivateError(null);
                    publishReady(!(me?.isReady ?? false));
                  }}
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
          roomId={numericRoomId}
          title={title}
          mode={mode}
          teamName={teamName}
          hasPassword={hasPassword}
          maxPlayers={maxPlayers}
          currentPlayers={members.length}
          selectedMap={selectedMap}
        />

        <ConfirmModal
          isOpen={pendingMemberAction !== null}
          title={memberActionConfirmTitle}
          description={memberActionConfirmDescription}
          confirmLabel={memberActionConfirmButtonLabel}
          confirmTone={pendingMemberAction?.type === 'kick' ? 'danger' : 'primary'}
          onCancel={handleCancelMemberAction}
          onConfirm={handleConfirmMemberAction}
        />

        <ConfirmModal
          isOpen={showLeaveConfirm}
          title="방에서 나가겠습니까?"
          description="대기실에서 나가면 로비로 돌아갑니다."
          confirmLabel="나가기"
          confirmTone="danger"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={handleLeaveConfirm}
        />
      </div>
    </div>
  );
}
