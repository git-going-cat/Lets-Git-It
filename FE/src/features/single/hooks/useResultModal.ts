import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { MYPAGE_QUERY_KEYS } from '@/features/mypage/constants/queryKeys';

import { singleApi } from '../api/singleApi';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

import type { GameResult } from '../store/gameResultAtom';
import type { PlayLogEntry } from '../types/single.types';

interface SaveResultVariables {
  currentPlayLog: PlayLogEntry[];
  currentResult: GameResult;
  id: string;
}

export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const result = useAtomValue(gameResultAtom);
  const setResult = useSetAtom(gameResultAtom);
  const { bestScore, difficulty, sessionId, playLog } = useSingleStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: saveData,
    isError: isSaveError,
    isPending: isSaving,
    mutate: saveResult,
    reset: resetSaveMutation,
  } = useMutation({
    mutationFn: ({ currentPlayLog, currentResult, id }: SaveResultVariables) =>
      singleApi.saveResult(id, {
        status:
          currentResult.status === 'ESCAPE_FAILED' || currentResult.status === 'SESSION_EXPIRED'
            ? 'GAMEOVER'
            : currentResult.status,
        score: currentResult.score,
        playTime: Math.round(currentResult.playTimeMs / 1000),
        grade: currentResult.grade,
        playLog: currentPlayLog,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
    },
    retry: 1,
  });

  useEffect(() => {
    if (!result || !sessionId) return;
    if (result.status === 'SESSION_EXPIRED') return;
    saveResult({ currentPlayLog: playLog, currentResult: result, id: sessionId });
  }, [playLog, result, saveResult, sessionId]);

  const isVisible = (gameStatus === 'gameover' || gameStatus === 'cleared') && result !== null;
  const isNewRecord = saveData?.isNewRecord ?? (result !== null && result.score > (bestScore ?? 0));

  const onRestart = async () => {
    if (!difficulty) return;
    resetSaveMutation();
    try {
      const nextSession = await singleApi.startSession(difficulty);
      setGameStatus('playing');
      setResult(null);
      useSingleStore.getState().setSession(nextSession);
    } catch {
      navigate({ to: '/home', replace: true });
    }
  };

  const onRanking = () => navigate({ to: '/ranking' });
  const onHome = () => navigate({ to: '/home' });

  return {
    isVisible,
    result,
    difficulty,
    isNewRecord,
    isSaving,
    saveError: isSaveError,
    onRestart,
    onRanking,
    onHome,
  };
}
