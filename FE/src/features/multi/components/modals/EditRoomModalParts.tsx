import { Settings, X } from 'lucide-react';

type EditRoomModalHeaderProps = {
  onClose: () => void;
};

export function EditRoomModalHeader({ onClose }: EditRoomModalHeaderProps) {
  return (
    <div className="flex h-9 items-center gap-2 bg-[#217346] px-3">
      <Settings className="h-4 w-4 text-white/60" />
      <span className="flex-1 text-sm font-medium text-white">방 수정</span>
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center text-white/85 transition-colors hover:bg-red-500 hover:text-white"
        aria-label="방 수정 닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type EditRoomModalFooterProps = {
  formId: string;
  isPending: boolean;
  isSubmitDisabled: boolean;
  onClose: () => void;
};

export function EditRoomModalFooter({
  formId,
  isPending,
  isSubmitDisabled,
  onClose,
}: EditRoomModalFooterProps) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-300 bg-[#f0f0f0] px-4 py-2.5">
      <button
        type="button"
        onClick={onClose}
        disabled={isPending}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        취소
      </button>
      <button
        type="submit"
        form={formId}
        disabled={isSubmitDisabled}
        className="rounded border border-[#175c35] bg-[#217346] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#175c35] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

type PasswordFieldProps = {
  hasPassword: boolean;
  draftHasPassword: boolean;
  draftPassword: string;
  onHasPasswordChange: (hasPassword: boolean) => void;
  onPasswordChange: (password: string) => void;
};

export function PasswordField({
  hasPassword,
  draftHasPassword,
  draftPassword,
  onHasPasswordChange,
  onPasswordChange,
}: PasswordFieldProps) {
  return (
    <tr>
      <td className="border border-[#c8dfd0] bg-[#e8f5ee] px-2 py-2 font-mono text-[#3b7a57]">
        password
      </td>
      <td className="border border-[#c8dfd0] bg-white px-2 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-600">
            {draftHasPassword ? '비밀번호 사용' : '공개 방'}
          </span>
          <button
            type="button"
            onClick={() => {
              onHasPasswordChange(!draftHasPassword);
              onPasswordChange('');
            }}
            className={`relative h-5 w-9 rounded-full! border-none transition-colors ${
              draftHasPassword ? 'bg-[#217346]' : 'bg-gray-300'
            }`}
            aria-label="비밀번호 설정 전환"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                draftHasPassword ? 'left-4.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        {draftHasPassword && (
          <div className="mt-2 flex flex-col gap-1">
            <input
              type="password"
              value={draftPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-[#217346]"
              placeholder={hasPassword ? '변경할 때만 입력' : '새 비밀번호'}
              aria-label="방 비밀번호"
            />
            {hasPassword && (
              <p className="text-xs text-gray-400">비워두면 기존 비밀번호를 유지합니다.</p>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
