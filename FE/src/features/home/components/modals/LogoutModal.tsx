import { useState } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import AccountConfirmModal from '@/features/mypage/components/AccountConfirmModal';
import { ACCOUNT_ACTION_COPY } from '@/features/mypage/constants/accountActions';

interface LogoutModalProps {
  onClose: () => void;
}

export default function LogoutModal({ onClose }: LogoutModalProps) {
  const { logout } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await logout();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AccountConfirmModal
      title={ACCOUNT_ACTION_COPY.logout.title}
      description={ACCOUNT_ACTION_COPY.logout.description}
      confirmLabel={ACCOUNT_ACTION_COPY.logout.confirmLabel}
      cancelLabel={ACCOUNT_ACTION_COPY.logout.cancelLabel}
      onConfirm={() => void handleLogout()}
      onClose={onClose}
      isPending={isPending}
      confirmVariant="primary"
    />
  );
}
