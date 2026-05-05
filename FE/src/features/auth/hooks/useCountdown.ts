import { useEffect, useState } from 'react';

/**
 * 서버에서 받은 만료 시각(ISO 문자열)을 기반으로 남은 시간을 1초 단위로 카운트다운합니다.
 *
 * @param expiredAt - 만료 시각 ISO 문자열 (Z 없는 UTC도 허용). null이면 비활성 상태.
 * @returns `timeLeft` — null: 초기화 전, 0: 만료됨, 양수: 남은 초
 * @returns `formattedTime` — "MM:SS" 형식 문자열
 */
export function useCountdown(expiredAt: string | null) {
  const [rawTimeLeft, setRawTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiredAt) return;

    const calculateTimeLeft = () => {
      // 서버가 UTC 시간을 Z 없이 반환하므로 명시적으로 UTC로 파싱
      const utcString = expiredAt.endsWith('Z') ? expiredAt : expiredAt + 'Z';
      const expirationTime = new Date(utcString).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expirationTime - now) / 1000));
      setRawTimeLeft(diff);
    };

    calculateTimeLeft();

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiredAt]);

  // expiredAt이 null이면 effect 밖에서 파생값으로 처리 (setState-in-effect 회피)
  const timeLeft = expiredAt ? rawTimeLeft : null;

  const safeTime = timeLeft ?? 0;
  const minutes = String(Math.floor(safeTime / 60)).padStart(2, '0');
  const seconds = String(safeTime % 60).padStart(2, '0');

  return {
    timeLeft, // null: 아직 계산 전, 0: 실제 만료, 양수: 남은 시간
    formattedTime: `${minutes}:${seconds}`,
  };
}
