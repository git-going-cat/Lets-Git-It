import { useEffect, useState } from 'react';

/**
 * 서버에서 받은 만료 시각(ISO 문자열)을 기반으로 남은 시간을 1초 단위로 카운트다운합니다.
 *
 * 서버가 KST 시간을 Z 없이 반환하므로, 브라우저가 로컬 시간(KST)으로 파싱하도록 그대로 사용합니다.
 * 추후 BE에서 +09:00 오프셋을 포함한 ISO 8601 형식으로 변경 시 이 처리는 제거해도 됩니다.
 *
 * @param expiredAt - 만료 시각 ISO 문자열 (KST, Z/오프셋 없음). null이면 비활성 상태.
 * @returns `timeLeft` — null: 초기화 전, 0: 만료됨, 양수: 남은 초
 * @returns `formattedTime` — "MM:SS" 형식 문자열
 */
export function useCountdown(expiredAt: string | null) {
  const [rawTimeLeft, setRawTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiredAt) return;

    const calculateTimeLeft = () => {
      // 타임존 오프셋이 명시된 경우(Z 또는 ±HH:MM 접미사)는 그대로 파싱.
      // naive ISO(오프셋 없음)는 서버가 KST로 반환하는 것이므로 +09:00을 보정.
      // includes('+') 대신 정규식으로 오프셋 위치를 정확히 검사하여 오탐 방지.
      // TODO: BE에서 +09:00 오프셋 포함 시 아래 임시 처리 제거 가능
      const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(expiredAt);
      const kstString = hasTimezone ? expiredAt : `${expiredAt}+09:00`;
      const expirationTime = new Date(kstString).getTime();
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
