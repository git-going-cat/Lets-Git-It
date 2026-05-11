import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Win11Window } from '@/shared/components/Win11Window';
import { useModal } from '@/shared/hooks/useModal';
import { NICKNAME_DUPLICATE_ERROR_CODE, NICKNAME_RULE } from '@/shared/schemas/nickname.schema';

import { ACCOUNT_ACTION_COPY, WITHDRAWAL_DELETED_ITEMS } from '../constants/accountActions';
import { MYPAGE_QUERY_KEYS } from '../constants/queryKeys';
import { useCheckNickname, useUpdateNickname, useWithdrawMember } from '../hooks/useEditProfile';
import { editNicknameSchema } from '../schemas/editProfile.schema';

import AccountConfirmModal from './AccountConfirmModal';
import { ChangePasswordModal } from './ChangePasswordModal';

import type { AuthType } from '../types/mypage.types';
import type { ChangeEvent } from 'react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  authType: AuthType;
  currentNickname?: string;
}

export function EditProfileModal({
  isOpen,
  onClose,
  authType,
  currentNickname = '',
}: EditProfileModalProps) {
  useModal({ isOpen, onClose });

  const [nickname, setNickname] = useState(currentNickname);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSuccess, setNicknameSuccess] = useState('');
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isNicknameSuccessNoticeOpen, setIsNicknameSuccessNoticeOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const updateUser = useAuthStore((state) => state.updateUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkNicknameMutation = useCheckNickname();
  const updateNicknameMutation = useUpdateNickname();
  const withdrawMutation = useWithdrawMember();

  if (!isOpen) return null;

  const handleNicknameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNickname(event.target.value);
    setIsNicknameChecked(false);
    setNicknameError('');
    setNicknameSuccess('');
  };

  const handleCheckDuplicate = () => {
    setNicknameError('');
    setNicknameSuccess('');

    const result = editNicknameSchema.safeParse({ nickname });
    if (!result.success) {
      setNicknameError(result.error.issues[0].message);
      return;
    }

    if (nickname === currentNickname) {
      setNicknameError('현재 사용 중인 닉네임입니다.');
      return;
    }

    checkNicknameMutation.mutate(nickname, {
      onSuccess: () => {
        setIsNicknameChecked(true);
        setNicknameSuccess('사용 가능한 닉네임입니다.');
      },
      onError: (error) => {
        const errorCode = isAxiosError(error) ? error.response?.data?.code : null;
        if (errorCode === NICKNAME_DUPLICATE_ERROR_CODE) {
          setNicknameError(NICKNAME_RULE.messages.duplicate);
          return;
        }

        setNicknameError(NICKNAME_RULE.messages.checkFailed);
      },
    });
  };

  const handleSaveNickname = () => {
    if (!isNicknameChecked) return;

    updateNicknameMutation.mutate(nickname, {
      onSuccess: () => {
        updateUser({ nickname });
        queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
        setIsNicknameSuccessNoticeOpen(true);
      },
      onError: () => {
        setNicknameError(NICKNAME_RULE.messages.saveFailed);
      },
    });
  };

  const handleCloseWithdrawModal = () => {
    if (withdrawMutation.isPending) return;

    setWithdrawError('');
    setIsWithdrawModalOpen(false);
  };

  const handleNicknameSuccessConfirm = () => {
    setIsNicknameSuccessNoticeOpen(false);
  };

  const handleWithdraw = (password?: string) => {
    setWithdrawError('');

    withdrawMutation.mutate(password, {
      onSuccess: () => {
        clearAuth();
        void navigate({ to: '/login' });
      },
      onError: (error) => {
        const errorCode = isAxiosError(error) ? error.response?.data?.code : null;

        if (errorCode === 'INVALID_CREDENTIALS') {
          setWithdrawError('현재 비밀번호가 일치하지 않습니다.');
          return;
        }

        setWithdrawError('회원탈퇴에 실패했습니다.');
      },
    });
  };

  return (
    <>
      <Win11Window title="내 정보 수정" onClose={onClose} className="w-[540px]">
        <div className="flex w-full flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-gray-800">닉네임 변경</h3>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <Input
                value={nickname}
                onChange={handleNicknameChange}
                placeholder={`${NICKNAME_RULE.minLength}~${NICKNAME_RULE.maxLength}자 한글/영문/숫자`}
                className="flex-1 rounded-lg"
              />
              <Button
                onClick={handleCheckDuplicate}
                disabled={
                  checkNicknameMutation.isPending || nickname === currentNickname || !nickname
                }
                className="whitespace-nowrap"
              >
                중복확인
              </Button>
              <Button
                onClick={handleSaveNickname}
                disabled={!isNicknameChecked || updateNicknameMutation.isPending}
                className="whitespace-nowrap"
              >
                저장
              </Button>
            </div>
            {nicknameError && <span className="text-sm text-red-500">{nicknameError}</span>}
            {nicknameSuccess && <span className="text-sm text-green-600">{nicknameSuccess}</span>}
          </section>

          <hr className="border-gray-200" />

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-gray-800">비밀번호 재설정</h3>
            <div className="flex items-center justify-between">
              <span className="mr-2 flex-1 text-sm leading-relaxed text-gray-600">
                {authType === 'OAUTH'
                  ? '소셜 로그인(Google) 사용자는 비밀번호 변경이 불가능합니다.'
                  : '주기적인 비밀번호 변경으로 계정을 안전하게 보호하세요.'}
              </span>
              <Button
                onClick={() => setIsChangePasswordModalOpen(true)}
                disabled={authType === 'OAUTH'}
                className="whitespace-nowrap"
              >
                재설정
              </Button>
            </div>
          </section>

          <div className="mt-4 flex justify-start">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="nes-rounded-button bg-red-500 px-4 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-600 active:bg-red-700"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </Win11Window>

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {isNicknameSuccessNoticeOpen && (
        <AccountConfirmModal
          title="닉네임 변경"
          description="닉네임이 성공적으로 변경되었습니다."
          confirmLabel="확인"
          cancelLabel="닫기"
          onConfirm={handleNicknameSuccessConfirm}
          onClose={handleNicknameSuccessConfirm}
          confirmVariant="primary"
        />
      )}

      {isWithdrawModalOpen && (
        <AccountConfirmModal
          title={ACCOUNT_ACTION_COPY.withdraw.title}
          description={ACCOUNT_ACTION_COPY.withdraw.description}
          confirmLabel={ACCOUNT_ACTION_COPY.withdraw.confirmLabel}
          cancelLabel={ACCOUNT_ACTION_COPY.withdraw.cancelLabel}
          deletedItems={WITHDRAWAL_DELETED_ITEMS}
          requiresPassword={authType === 'LOCAL'}
          passwordLabel={ACCOUNT_ACTION_COPY.withdraw.passwordLabel}
          passwordPlaceholder={ACCOUNT_ACTION_COPY.withdraw.passwordPlaceholder}
          isPending={withdrawMutation.isPending}
          errorMessage={withdrawError}
          onConfirm={handleWithdraw}
          onClose={handleCloseWithdrawModal}
        />
      )}
    </>
  );
}
