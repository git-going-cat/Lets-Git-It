import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { MYPAGE_QUERY_KEYS } from '@/shared/constants/queryKeys';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { singleApi } from '../api/singleApi';
import { singleBus } from '../bridge/singleBus';
import { gameResultAtom } from '../store/gameResultAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * 게임 종료 후 결과 저장 및 결과 모달 상태를 관리합니다.
 *
 * gameStatus가 'gameover'/'cleared'로 전환되면 서버에 결과를 POST하고
 * 저장 완료 여부·신기록 여부를 반환합니다. 다시하기 시 새 세션을 시작합니다.
 */
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
        playTime: result.playTimeMs,
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
    try {
      const nextSession = await singleApi.startSession(difficulty);
      // 새 세션 확보 후에 결과 모달 상태를 비운다. startSession 실패 시 기존 saveData/saveError를
      // 보존해야 에러 다이얼로그를 닫고 ResultModal로 복귀했을 때 isNewRecord 표시가 어긋나지 않는다.
      setSaveData(null);
      setSaveError(false);
      setIsSaving(false);
      savedSessionRef.current = null;
      // setSession을 먼저 호출해 store에 새 세션을 반영한 뒤 status 전환.
      // 'game:restart' 이벤트는 SingleScene.scene.restart + useSingleGame atom 리셋을 트리거한다.
      useSingleStore.getState().setSession(nextSession);
      setResult(null);
      setGameStatus('playing');
      singleBus.emit('game:restart', {
        sessionId: nextSession.sessionId,
        difficulty: nextSession.difficulty,
        commandSet: useSingleStore.getState().commandSet,
        isTutorial: useSingleStore.getState().isTutorial,
      });
    } catch {
      // SinglePage가 startSessionError를 구독해 Win11Dialog로 표시한다.
      useSingleStore.getState().setStartSessionError(true);
    } finally {
      setIsRestarting(false);
    }
  };

  const onHome = () => void navigate({ to: '/home' });

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
