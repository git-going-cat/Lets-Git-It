import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/shared/components/Input';

import type { ReactNode } from 'react';

interface AccountConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (password?: string) => void;
  onClose: () => void;
  isPending?: boolean;
  requiresPassword?: boolean;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  deletedItems?: readonly string[];
  errorMessage?: string;
  confirmVariant?: 'primary' | 'danger';
  children?: ReactNode;
}

export default function AccountConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  isPending = false,
  requiresPassword = false,
  passwordLabel = '비밀번호',
  passwordPlaceholder = '비밀번호를 입력하세요',
  deletedItems,
  errorMessage,
  confirmVariant = 'danger',
  children,
}: AccountConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const VisibilityIcon = isPasswordVisible ? EyeOff : Eye;
  const isConfirmDisabled = isPending || (requiresPassword && password.trim().length === 0);
  const confirmButtonClassName =
    confirmVariant === 'danger'
      ? 'rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'
      : 'rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50';

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm(requiresPassword ? password : undefined);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="flex w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#f3f3f3] px-4 py-2">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="닫기"
            disabled={isPending}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <p className="whitespace-pre-line text-center text-sm leading-6 text-gray-700">
            {description}
          </p>

          {deletedItems && deletedItems.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <p className="mb-2 text-xs font-bold text-red-600">삭제되는 항목</p>
              <ul className="flex flex-col gap-1 text-xs text-red-700">
                {deletedItems.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          )}

          {requiresPassword && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">{passwordLabel}</label>
              <div className="relative">
                <Input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={passwordPlaceholder}
                  className="w-full rounded-lg pr-10"
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <VisibilityIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {children}

          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
        </div>

        <div className="flex justify-end gap-2 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={confirmButtonClassName}
          >
            {isPending ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
