import { useEffect, useState } from 'react';

export function useCountdown(expiredAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiredAt) return;

    const calculateTimeLeft = () => {
      const expirationTime = new Date(expiredAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expirationTime - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiredAt]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return {
    timeLeft,
    formattedTime: `${minutes}:${seconds}`,
  };
}
