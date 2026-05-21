import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import DictionaryModal from '@/features/dictionary/components/DictionaryModal';
import { HomePage } from '@/features/home/components/HomePage';
import { SCENARIOS } from '@/features/incident/constants/scenarios';
import { useIncidentProgress } from '@/features/incident/store/incidentProgressStore';
import { singleApi } from '@/features/single/api/singleApi';
import { useSingleStore } from '@/features/single/store/singleStore';

import type { Difficulty } from '@/shared/types/game.types';

// features/home에서 features/single API/store, features/incident, features/dictionary를
// 직접 import하면 cross-feature 직접 의존이 된다.
// FE_CONVENTION §15 wiring 예외에 따라 routes/ 레이어에서 결합한다.
export default function HomeRoute() {
  const { modal, lobby } = useSearch({ from: '/home' });
  const navigate = useNavigate();

  // ?modal=... / ?lobby=... 진입 후 URL을 깔끔히 정리. 재진입 시 자동 재오픈 방지.
  const onUrlCleanup = useCallback(() => {
    void navigate({ to: '/home', search: {}, replace: true });
  }, [navigate]);

  // 모드 선택 모달에서 '게임 시작' 클릭 시 호출. 실패 시 throw하여 모달이 에러 다이얼로그를 띄운다.
  const onStartSingle = useCallback(async (difficulty: Difficulty) => {
    useSingleStore.getState().clearSession();
    const data = await singleApi.startSession(difficulty);
    useSingleStore.getState().setSession(data);
  }, []);

  const { isCleared } = useIncidentProgress();

  return (
    <HomePage
      initialModal={modal ?? null}
      initialLobbyMode={lobby ?? null}
      onUrlCleanup={onUrlCleanup}
      onStartSingle={onStartSingle}
      incidentScenarios={SCENARIOS}
      isIncidentCleared={isCleared}
      renderDictionaryModal={(onClose) => <DictionaryModal onClose={onClose} />}
    />
  );
}
