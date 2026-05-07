import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Win11Window } from '@/shared/components/Win11Window';

import { useUpdatePassword, useVerifyPassword } from '../hooks/useEditProfile';
import { changePasswordSchema } from '../schemas/editProfile.schema';

import AccountConfirmModal from './AccountConfirmModal';

import type { ChangeEvent } from 'react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  isVisible,
  onToggleVisibility,
}: PasswordFieldProps) {
  const VisibilityIcon = isVisible ? EyeOff : Eye;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Input
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg pr-10"
        />
        <button
          type="button"
          aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
          onClick={onToggleVisibility}
          className="nes-rounded-button absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <VisibilityIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'verify' | 'change'>('verify');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [changeError, setChangeError] = useState('');
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSuccessNoticeOpen, setIsSuccessNoticeOpen] = useState(false);

  const verifyMutation = useVerifyPassword();
  const updateMutation = useUpdatePassword();

  if (!isOpen) return null;

  const resetForm = () => {
    setStep('verify');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVerifyError('');
    setChangeError('');
    setIsCurrentPasswordVisible(false);
    setIsNewPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const handleClose = () => {
    resetForm();
    setIsSuccessNoticeOpen(false);
    onClose();
  };

  const handleSuccessConfirm = () => {
    handleClose();
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
          return;
        }

        setVerifyError('비밀번호 검증에 실패했습니다.');
      },
    });
  };

  const handleChange = () => {
    setChangeError('');

    const result = changePasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      setChangeError(result.error.issues[0].message);
      return;
    }

    updateMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          resetForm();
          setIsSuccessNoticeOpen(true);
        },
        onError: (error) => {
          const code = isAxiosError(error) ? error.response?.data?.code : null;
          if (code === 'SAME_AS_CURRENT_PASSWORD') {
            setChangeError('현재 비밀번호와 동일한 비밀번호로 변경할 수 없습니다.');
            return;
          }

          if (code === 'INVALID_PASSWORD_FORMAT') {
            setChangeError('유효하지 않은 비밀번호 형식입니다.');
            return;
          }

          setChangeError('비밀번호 변경에 실패했습니다.');
        },
      }
    );
  };

  return (
    <>
      <Win11Window title="비밀번호 변경" onClose={handleClose}>
        {/* w-[320px]: 비밀번호 변경 단계의 단일 입력 폼 폭을 고정합니다. */}
        <div className="flex w-[320px] flex-col gap-4">
          {step === 'verify' && (
            <>
              <PasswordField
                label="현재 비밀번호"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                isVisible={isCurrentPasswordVisible}
                onToggleVisibility={() => setIsCurrentPasswordVisible((prev) => !prev)}
              />
              {verifyError && <span className="text-xs text-red-500">{verifyError}</span>}
              <div className="mt-2 flex justify-end">
                <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
                  확인
                </Button>
              </div>
            </>
          )}

          {step === 'change' && (
            <>
              <PasswordField
                label="새 비밀번호"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="8자 이상, 영문+숫자+특수문자"
                isVisible={isNewPasswordVisible}
                onToggleVisibility={() => setIsNewPasswordVisible((prev) => !prev)}
              />
              <PasswordField
                label="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                isVisible={isConfirmPasswordVisible}
                onToggleVisibility={() => setIsConfirmPasswordVisible((prev) => !prev)}
              />
              {changeError && <span className="text-xs text-red-500">{changeError}</span>}
              <div className="mt-2 flex justify-end">
                <Button onClick={handleChange} disabled={updateMutation.isPending}>
                  변경하기
                </Button>
              </div>
            </>
          )}
        </div>
      </Win11Window>

      {isSuccessNoticeOpen && (
        <AccountConfirmModal
          title="비밀번호 변경"
          description="비밀번호가 성공적으로 변경되었습니다."
          confirmLabel="확인"
          cancelLabel="닫기"
          onConfirm={handleSuccessConfirm}
          onClose={handleSuccessConfirm}
          confirmVariant="primary"
        />
      )}
    </>
  );
}
