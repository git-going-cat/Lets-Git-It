import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { MYPAGE_QUERY_KEYS } from '@/features/mypage/constants/queryKeys';

import { singleApi } from '../api/singleApi';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const result = useAtomValue(gameResultAtom);
  const setResult = useSetAtom(gameResultAtom);
  const { bestScore, difficulty, sessionId } = useSingleStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const savedSessionRef = useRef<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveData, setSaveData] = useState<{ isNewRecord: boolean } | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    if (!result || !sessionId) return;
    if (result.status === 'SESSION_EXPIRED') return;
    if (savedSessionRef.current === sessionId) return;
    savedSessionRef.current = sessionId;

    setIsSaving(true);
    setSaveError(false);

    // StrictMode cleanup이 in-flight 요청을 취소하지 않도록 cancelled 플래그를 두지 않는다.
    // 대신 savedSessionRef로 "현재 추적 중인 세션과 일치하는 응답인지"만 검증한다.
    // 다시하기 시 savedSessionRef가 null로 리셋되므로 이전 세션 응답은 자동으로 무시된다.
    const playLog = useSingleStore.getState().playLog;
    singleApi
      .saveResult(sessionId, {
        status: result.status === 'ESCAPE_FAILED' ? 'GAMEOVER' : result.status,
        score: result.score,
        playTime: Math.round(result.playTimeMs / 1000),
        grade: result.grade,
        playLog,
      })
      .then((data) => {
        if (savedSessionRef.current !== sessionId) return;
        setSaveData(data);
        setIsSaving(false);
        void queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
      })
      .catch(() => {
        if (savedSessionRef.current !== sessionId) return;
        setSaveError(true);
        setIsSaving(false);
      });
  }, [result, sessionId, queryClient]);

  const isVisible = (gameStatus === 'gameover' || gameStatus === 'cleared') && result !== null;
  const isNewRecord = saveData?.isNewRecord ?? (result !== null && result.score > (bestScore ?? 0));

  const onRestart = async () => {
    if (!difficulty || isRestarting) return;
    setIsRestarting(true);
    setSaveData(null);
    setSaveError(false);
    setIsSaving(false);
    savedSessionRef.current = null;
    try {
      const nextSession = await singleApi.startSession(difficulty);
      setGameStatus('playing');
      setResult(null);
      useSingleStore.getState().setSession(nextSession);
    } catch {
      navigate({ to: '/home', replace: true });
    }
  };

  const onHome = () => navigate({ to: '/home' });

  return {
    isVisible,
    result,
    difficulty,
    isNewRecord,
    isSaving,
    saveError,
    isRestarting,
    onRestart,
    onHome,
  };
}
