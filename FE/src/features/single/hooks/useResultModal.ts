import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { singleApi } from '../api/singleApi';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * ResultModal의 표시 여부, 결과 데이터, 버튼 핸들러를 제공합니다.
 *
 * gameResultAtom에 결과가 저장되는 시점에 점수 저장 API를 자동 호출합니다.
 * isNewRecord: API 응답 기준. 응답 전까지는 로컬 bestScore와 비교한 낙관적 값을 사용합니다.
 * saveError: API 저장 실패 여부. 실패해도 모달 동작은 유지됩니다.
 */
export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const result = useAtomValue(gameResultAtom);
  const setResult = useSetAtom(gameResultAtom);
  const { bestScore, difficulty, sessionId, playLog } = useSingleStore();
  const navigate = useNavigate();

  const saveMutation = useMutation({
    mutationFn: (id: string) =>
      singleApi.saveResult(id, {
        status: result!.status,
        score: result!.score,
        playTime: Math.round(result!.playTimeMs / 1000),
        grade: result!.grade,
        playLog,
      }),
    retry: 1,
  });

  useEffect(() => {
    if (!result || !sessionId) return;
    saveMutation.mutate(sessionId);
  }, [result, sessionId]); // saveMutation.mutate는 안정적인 참조라 의존성에서 생략

  const isVisible = (gameStatus === 'gameover' || gameStatus === 'cleared') && result !== null;
  // API 응답이 오기 전까지는 로컬 bestScore 기준으로 낙관적 표시
  const isNewRecord =
    saveMutation.data?.isNewRecord ?? (result !== null && result.score > (bestScore ?? 0));

  const onRestart = () => {
    setGameStatus('playing');
    setResult(null);
    saveMutation.reset();
    EventBus.emit('game:restart');
  };

  const onRanking = () => navigate({ to: '/ranking' });
  const onHome = () => navigate({ to: '/home' });

  return {
    isVisible,
    result,
    difficulty,
    isNewRecord,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.isError,
    onRestart,
    onRanking,
    onHome,
  };
}
