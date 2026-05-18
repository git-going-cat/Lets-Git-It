import { Crown, MoreVertical, UserX } from 'lucide-react';

import AnimatedCharacter from '@/shared/components/AnimatedCharacter';

import type { RoomMember } from '../types/room.types';
import type { CharacterAsset } from '@/shared/components/AnimatedCharacter';

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const HATCHED = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, #e8f5ee 0, #e8f5ee 3px, #f8fff9 3px, #f8fff9 9px)',
};

interface MembersSpreadsheetProps {
  slots: (RoomMember | null)[];
  myPlayerId: string | undefined;
  isHostView: boolean;
  openMemberActionId: string | null;
  onToggleMemberActions: (playerId: string) => void;
  onKickMember: (member: RoomMember) => void;
  onTransferHost: (member: RoomMember) => void;
}

function toAsset(member: RoomMember): CharacterAsset {
  return {
    characterHair: member.characterHair,
    characterHairColor: member.characterHairColor,
    characterBody: member.characterBody,
    characterEye: member.characterEye,
    characterOutfit: member.characterOutfit,
    characterOutfitColor: member.characterOutfitColor,
  };
}

export function MembersSpreadsheet({
  slots,
  myPlayerId,
  isHostView,
  openMemberActionId,
  onToggleMemberActions,
  onKickMember,
  onTransferHost,
}: MembersSpreadsheetProps) {
  return (
    <div className="h-full overflow-auto select-none bg-white">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-7" />
          {slots.map((_, index) => (
            <col key={index} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-7">
            <th className="border border-[#c8dfd0] bg-[#e8f5ee]" />
            {slots.map((_, index) => (
              <th
                key={index}
                className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm font-semibold text-[#175c35]"
              >
                {COL_LETTERS[index]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="min-h-48">
          <tr className="h-8">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              1
            </td>
            {slots.map((member, index) => (
              <td
                key={index}
                className="relative border border-[#c8dfd0] px-1 py-1"
                style={!member ? HATCHED : {}}
              >
                {member && (
                  <div className="flex min-h-6 items-start gap-1 pr-6">
                    <div className="flex flex-wrap gap-0.5">
                      {member.isHost && (
                        <span className="inline-flex items-center justify-center rounded-sm bg-amber-400 px-1 py-0.5 text-md font-bold leading-none text-amber-900">
                          HOST
                        </span>
                      )}
                      {member.playerId === myPlayerId && (
                        <span className="inline-flex items-center justify-center rounded-sm bg-[#217346] px-1 py-0.5 text-md font-bold leading-none text-white">
                          ME
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center justify-center rounded-sm px-1 py-0.5 text-md font-bold leading-none ${
                          member.isHost || member.isReady
                            ? 'bg-[#e8f5e9] text-[#1b5e20]'
                            : 'bg-[#fce4ec] text-[#880e4f]'
                        }`}
                      >
                        {member.isHost || member.isReady ? 'READY' : 'WAIT'}
                      </span>
                    </div>
                    {isHostView && !member.isHost && member.playerId !== myPlayerId && (
                      <div className="absolute right-1 top-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleMemberActions(member.playerId);
                          }}
                          className="flex h-5 w-5 items-center justify-center rounded border border-[#c8dfd0] bg-white text-[#3b7a57] hover:border-[#217346] hover:bg-[#e8f5ee]"
                          aria-label={`${member.nickname} 멤버 작업 열기`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {openMemberActionId === member.playerId && (
                          <div className="absolute right-0 top-6 z-40 w-28 overflow-hidden rounded border border-gray-300 bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onTransferHost(member);
                              }}
                              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-[#e8f5ee] hover:text-[#175c35]"
                            >
                              <Crown className="h-3.5 w-3.5" />
                              방장 위임
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onKickMember(member);
                              }}
                              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              추방
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </td>
            ))}
          </tr>

          <tr className="h-45">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              2
            </td>
            {slots.map((member, index) => (
              <td
                key={index}
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

          <tr className="h-7">
            <td className="border border-[#c8dfd0] bg-[#e8f5ee] text-center text-sm text-gray-500">
              3
            </td>
            {slots.map((member, index) => (
              <td
                key={index}
                className="border border-[#c8dfd0] p-0 h-px"
                style={!member ? HATCHED : {}}
              >
                {member && (
                  <div className="flex h-full divide-x divide-[#c8dfd0]">
                    <span className="flex w-9 shrink-0 items-center justify-center bg-[#e8f5ee] font-mono text-md text-[#3b7a57]">
                      nick
                    </span>
                    <span className="flex flex-1 items-center overflow-hidden px-1.5 py-1 break-all text-md font-medium text-gray-800">
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
