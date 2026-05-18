import { useCallback, useState } from 'react';

/**
 * 방 코드 클립보드 복사 훅.
 *
 * - handleCopyCode: 클립보드 복사 + 2초 후 copied 상태 해제
 * - copied: 복사 완료 여부 (Check 아이콘 표시 등에 활용)
 */
export function useCopyRoomCode(roomCode: string | null | undefined) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (!roomCode) return;
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomCode]);

  return { copied, handleCopyCode };
}
