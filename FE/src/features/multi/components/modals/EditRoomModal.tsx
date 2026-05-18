import { useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useModal } from '@/shared/hooks/useModal';

import { useCoopMaps, useUpdateContributionRoom, useUpdateCoopRoom } from '../../hooks/useRoom';

import {
  buildPasswordPayload,
  CONTRIBUTION_PLAYER_OPTIONS,
  MAP_PAGE_SIZE,
} from './editRoomModal.helpers';
import { EditRoomModalFooter, EditRoomModalHeader, PasswordField } from './EditRoomModalParts';

import type { GameMode, SelectedMap } from '../../types/room.types';
import type { FormEvent, RefObject } from 'react';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: number;
  title: string | null | undefined;
  mode: GameMode | null | undefined;
  teamName: string | null | undefined;
  hasPassword: boolean;
  maxPlayers: number;
  currentPlayers: number;
  selectedMap: SelectedMap | null;
}

function getUpdateErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: { code?: string; message?: string } } })
    .response?.data;

  if (responseData?.code === 'NOT_HOST') {
    return '방장만 방 정보를 수정할 수 있습니다.';
  }

  return responseData?.message ?? '방 정보 수정에 실패했습니다. 다시 시도해 주세요.';
}

export function EditRoomModal({
  isOpen,
  onClose,
  roomId,
  title,
  mode,
  teamName,
  hasPassword,
  maxPlayers,
  currentPlayers,
  selectedMap,
}: EditRoomModalProps) {
  const { containerRef } = useModal({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <EditRoomModalContent
      containerRef={containerRef}
      onClose={onClose}
      roomId={roomId}
      title={title}
      mode={mode}
      teamName={teamName}
      hasPassword={hasPassword}
      maxPlayers={maxPlayers}
      currentPlayers={currentPlayers}
      selectedMap={selectedMap}
    />
  );
}

interface EditRoomModalContentProps extends Omit<EditRoomModalProps, 'isOpen'> {
  containerRef: RefObject<HTMLDivElement | null>;
}

function EditRoomModalContent({
  containerRef,
  onClose,
  roomId,
  title,
  mode,
  teamName,
  hasPassword,
  maxPlayers,
  currentPlayers,
  selectedMap,
}: EditRoomModalContentProps) {
  const formId = useId();
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draftTeamName, setDraftTeamName] = useState(teamName ?? '');
  const [draftHasPassword, setDraftHasPassword] = useState(hasPassword);
  const [draftPassword, setDraftPassword] = useState('');
  const [draftMaxPlayers, setDraftMaxPlayers] = useState(maxPlayers ?? 2);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(selectedMap?.mapId ?? null);
  const [mapOffset, setMapOffset] = useState(0);
  const [error, setError] = useState('');

  const { data: mapData, isLoading: isLoadingMaps } = useCoopMaps(mode === 'COOP');
  const { mutate: updateContributionRoom, isPending: isContributionPending } =
    useUpdateContributionRoom();
  const { mutate: updateCoopRoom, isPending: isCoopPending } = useUpdateCoopRoom();

  const isPending = isContributionPending || isCoopPending;
  const visibleMaps = mapData?.maps.slice(mapOffset, mapOffset + MAP_PAGE_SIZE) ?? [];
  const requiresNewPassword = draftHasPassword && !hasPassword;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextTitle = draftTitle.trim();
    const nextPassword = draftPassword.trim();

    if (!nextTitle) {
      setError('방 제목을 입력하세요.');
      return;
    }

    if (requiresNewPassword && !nextPassword) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    const passwordPayload = buildPasswordPayload(draftHasPassword, nextPassword);
    const passwordChanged = draftHasPassword !== hasPassword || nextPassword.length > 0;
    const titleChanged = nextTitle !== (title ?? '').trim();

    if (mode === 'CONTRIBUTION') {
      if (draftMaxPlayers < currentPlayers) {
        setError('최대 인원은 현재 인원보다 작게 설정할 수 없습니다.');
        return;
      }

      const hasChanges = titleChanged || draftMaxPlayers !== maxPlayers || passwordChanged;
      if (!hasChanges) {
        setError('변경된 내용이 없습니다.');
        return;
      }

      updateContributionRoom(
        {
          roomId,
          body: {
            title: nextTitle,
            hasPassword: draftHasPassword,
            ...passwordPayload,
            maxPlayers: draftMaxPlayers,
          },
        },
        {
          onSuccess: onClose,
          onError: (updateError) => setError(getUpdateErrorMessage(updateError)),
        }
      );
      return;
    }

    const nextTeamName = draftTeamName.trim();

    if (!nextTeamName) {
      setError('팀 이름을 입력하세요.');
      return;
    }

    if (!selectedMapId) {
      setError('맵을 선택하세요.');
      return;
    }

    const hasChanges =
      titleChanged ||
      nextTeamName !== (teamName ?? '').trim() ||
      selectedMapId !== selectedMap?.mapId ||
      passwordChanged;

    if (!hasChanges) {
      setError('변경된 내용이 없습니다.');
      return;
    }

    updateCoopRoom(
      {
        roomId,
        body: {
          title: nextTitle,
          teamName: nextTeamName,
          hasPassword: draftHasPassword,
          ...passwordPayload,
          selectedMapId,
        },
      },
      {
        onSuccess: onClose,
        onError: (updateError) => setError(getUpdateErrorMessage(updateError)),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="방 수정"
        tabIndex={-1}
        className="flex max-h-[86vh] w-[420px] flex-col overflow-hidden rounded border border-gray-400 bg-white shadow-2xl"
      >
        <EditRoomModalHeader onClose={onClose} />

        <form id={formId} onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="w-[34%] border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-2 font-mono text-[#3b7a57]">
                  title *
                </td>
                <td className="border border-[#c8dfd0] bg-white px-2 py-2">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    maxLength={30}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-[#217346]"
                    placeholder="방 제목"
                  />
                </td>
              </tr>

              {mode === 'CONTRIBUTION' && (
                <tr>
                  <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-2 font-mono text-[#3b7a57]">
                    maxPlayers *
                  </td>
                  <td className="border border-[#c8dfd0] bg-white px-2 py-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {CONTRIBUTION_PLAYER_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setDraftMaxPlayers(count)}
                          disabled={count < currentPlayers}
                          className={`rounded border px-2 py-1.5 text-sm font-medium transition-colors ${
                            draftMaxPlayers === count
                              ? 'border-[#217346] bg-[#d4eadd] text-[#175c35]'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-[#217346]'
                          } disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300`}
                        >
                          {count}명
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">현재 인원: {currentPlayers}명</p>
                  </td>
                </tr>
              )}

              {mode === 'COOP' && (
                <tr>
                  <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-2 font-mono text-[#3b7a57]">
                    teamName *
                  </td>
                  <td className="border border-[#c8dfd0] bg-white px-2 py-2">
                    <input
                      type="text"
                      value={draftTeamName}
                      onChange={(event) => setDraftTeamName(event.target.value)}
                      maxLength={20}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-[#217346]"
                      placeholder="팀 이름"
                    />
                  </td>
                </tr>
              )}

              <PasswordField
                hasPassword={hasPassword}
                draftHasPassword={draftHasPassword}
                draftPassword={draftPassword}
                onHasPasswordChange={setDraftHasPassword}
                onPasswordChange={setDraftPassword}
              />

              {mode === 'COOP' && (
                <tr>
                  <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-2 font-mono text-[#3b7a57]">
                    selectedMap *
                  </td>
                  <td className="border border-[#c8dfd0] bg-white px-2 py-2">
                    {isLoadingMaps ? (
                      <p className="text-xs text-gray-400">맵 목록 로딩 중...</p>
                    ) : mapData && mapData.maps.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {mapOffset + 1}-
                            {Math.min(mapOffset + MAP_PAGE_SIZE, mapData.maps.length)} /{' '}
                            {mapData.maps.length}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setMapOffset((offset) => Math.max(0, offset - 1))}
                              disabled={mapOffset === 0}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 hover:border-[#217346] hover:text-[#217346] disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-200"
                              aria-label="이전 맵"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMapOffset((offset) => offset + 1)}
                              disabled={mapOffset + MAP_PAGE_SIZE >= mapData.maps.length}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 hover:border-[#217346] hover:text-[#217346] disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-200"
                              aria-label="다음 맵"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {visibleMaps.map((map) => (
                            <button
                              key={map.mapId}
                              type="button"
                              disabled={!map.isActive}
                              onClick={() => setSelectedMapId(map.mapId)}
                              className={`flex min-h-17 flex-col items-center justify-center gap-1 rounded border px-1.5 py-1.5 text-center transition-colors ${
                                selectedMapId === map.mapId
                                  ? 'border-[#217346] bg-[#d4eadd]'
                                  : map.isActive
                                    ? 'border-gray-200 bg-white hover:border-[#217346] hover:bg-[#f0f7f3]'
                                    : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-45'
                              }`}
                            >
                              <span className="max-w-full break-all text-xs font-medium leading-tight text-gray-800">
                                {map.mapName}
                              </span>
                              <span className="text-xs text-amber-400">
                                {'★'.repeat(Math.min(map.difficulty, 5))}
                                {'☆'.repeat(Math.max(0, 5 - map.difficulty))}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">선택 가능한 맵이 없습니다.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {error && <p className="px-4 py-2 text-xs text-red-500">{error}</p>}
        </form>

        <EditRoomModalFooter
          formId={formId}
          isPending={isPending}
          isSubmitDisabled={isPending || mode == null}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
