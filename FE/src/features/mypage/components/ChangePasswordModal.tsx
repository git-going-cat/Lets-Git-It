import { useState } from 'react';
import { isAxiosError } from 'axios';

import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Win11Window } from '@/shared/components/Win11Window';

import { useUpdatePassword, useVerifyPassword } from '../hooks/useEditProfile';
import { changePasswordSchema } from '../schemas/editProfile.schema';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'verify' | 'change'>('verify');

  // Verify state
  const [currentPassword, setCurrentPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const verifyMutation = useVerifyPassword();

  // Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const updateMutation = useUpdatePassword();

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('verify');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVerifyError('');
    setChangeError('');
    onClose();
  };

  const handleVerify = () => {
    setVerifyError('');
    if (!currentPassword) {
      setVerifyError('현재 비밀번호를 입력해주세요.');
      return;
    }
    verifyMutation.mutate(currentPassword, {
      onSuccess: () => {
        setStep('change');
      },
      onError: (error) => {
        const errorCode = isAxiosError(error) ? error.response?.data?.code : null;
        if (errorCode === 'PASSWORD_MISMATCH') {
          setVerifyError('비밀번호가 일치하지 않습니다.');
        } else {
          setVerifyError('비밀번호 검증에 실패했습니다.');
        }
      },
    });
  };

  const handleChange = () => {
    setChangeError('');
    const result = changePasswordSchema.safeParse({ newPassword, confirmPassword });

    if (!result.success) {
      const firstError = result.error.issues[0].message;
      setChangeError(firstError);
      return;
    }

    updateMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          alert('비밀번호가 성공적으로 변경되었습니다.'); // TODO: Use Toast
          handleClose();
        },
        onError: (error) => {
          const code = isAxiosError(error) ? error.response?.data?.code : null;
          if (code === 'SAME_AS_CURRENT_PASSWORD') {
            setChangeError('현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.');
          } else if (code === 'INVALID_PASSWORD_FORMAT') {
            setChangeError('유효하지 않은 비밀번호 형식입니다.');
          } else {
            setChangeError('비밀번호 변경에 실패했습니다.');
          }
        },
      }
    );
  };

  return (
    <Win11Window title="비밀번호 변경" onClose={handleClose}>
      <div className="flex flex-col gap-4 w-[320px]">
        {step === 'verify' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">현재 비밀번호</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
              />
              {verifyError && <span className="text-xs text-red-500">{verifyError}</span>}
            </div>
            <div className="flex justify-end mt-2">
              <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
                확인
              </Button>
            </div>
          </>
        )}

        {step === 'change' && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상, 영문+숫자+특수문자"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">새 비밀번호 확인</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
              />
              {changeError && <span className="text-xs text-red-500">{changeError}</span>}
            </div>
            <div className="flex justify-end mt-2">
              <Button onClick={handleChange} disabled={updateMutation.isPending}>
                변경하기
              </Button>
            </div>
          </>
        )}
      </div>
    </Win11Window>
  );
}
