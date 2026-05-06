import { useState } from 'react';
import { isAxiosError } from 'axios';

import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Win11Window } from '@/shared/components/Win11Window';

import { useCheckNickname, useUpdateNickname } from '../hooks/useEditProfile';
import { editNicknameSchema } from '../schemas/editProfile.schema';

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
  const [nickname, setNickname] = useState(currentNickname);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSuccess, setNicknameSuccess] = useState('');

  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const checkNicknameMutation = useCheckNickname();
  const updateNicknameMutation = useUpdateNickname();

  if (!isOpen) return null;

  const handleNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
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
        if (errorCode === 'NICKNAME_DUPLICATE') {
          setNicknameError('이미 사용 중인 닉네임입니다.');
        } else {
          setNicknameError('중복 확인에 실패했습니다.');
        }
      },
    });
  };

  const handleSaveNickname = () => {
    if (!isNicknameChecked) return;

    updateNicknameMutation.mutate(nickname, {
      onSuccess: () => {
        alert('닉네임이 성공적으로 변경되었습니다.'); // TODO: Use Toast
        onClose();
      },
      onError: () => {
        setNicknameError('닉네임 변경에 실패했습니다.');
      },
    });
  };

  return (
    <>
      <Win11Window title="내 정보 수정" onClose={onClose}>
        <div className="flex flex-col gap-6 w-[360px]">
          {/* 섹션 1: 닉네임 변경 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-800">닉네임 변경</h3>
            <div className="flex gap-2">
              <Input
                value={nickname}
                onChange={handleNicknameChange}
                placeholder="2~6자, 한글/영문"
                className="flex-1"
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
            </div>
            {nicknameError && <span className="text-xs text-red-500">{nicknameError}</span>}
            {nicknameSuccess && <span className="text-xs text-green-600">{nicknameSuccess}</span>}
            <div className="flex justify-end mt-1">
              <Button
                onClick={handleSaveNickname}
                disabled={!isNicknameChecked || updateNicknameMutation.isPending}
              >
                저장
              </Button>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* 섹션 2: 비밀번호 재설정 */}
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-800">비밀번호 재설정</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 leading-tight flex-1 mr-2">
                {authType === 'OAUTH'
                  ? '소셜 로그인(Google) 사용자는 비밀번호 변경이 불가합니다'
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

          {/* 하단: 탈퇴하기 */}
          <div className="mt-4 flex justify-start">
            <button className="text-sm text-red-500 hover:text-red-600 underline opacity-80 hover:opacity-100 transition-opacity">
              탈퇴하기
            </button>
          </div>
        </div>
      </Win11Window>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </>
  );
}
