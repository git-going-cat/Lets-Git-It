import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import screenBg from '@/assets/bg/screen.png';

import { findScenario } from '../constants/scenarios';

import IncidentGame from './IncidentGame';

import type { ReactNode } from 'react';

// 시나리오 클리어 후 다음 시나리오 ID. null이면 "다음 임무" 버튼 미표시.
const NEXT_SCENARIO_ID: Record<number, number | null> = {
  1: 4,
  4: null,
};

interface IncidentPageProps {
  onScenarioClear: (scenarioId: number) => void;
  renderDictionaryModal: (onClose: () => void) => ReactNode;
}

/**
 * 고양이 사고처리반 게임 페이지.
 * SinglePage와 동일하게 h-screen 반응형 레이아웃을 사용한다.
 * cross-feature wiring(DictionaryModal, 진행도 기록)은 routes/-IncidentRoute에서 주입받는다.
 */
export default function IncidentPage({
  onScenarioClear,
  renderDictionaryModal,
}: IncidentPageProps) {
  const navigate = useNavigate();
  const { scenarioId } = useSearch({ from: '/incident' });
  const currentId = scenarioId ?? 1;
  const scenario = findScenario(currentId);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!scenario) void navigate({ to: '/home', search: {} });
  }, [scenario, navigate]);

  if (!scenario) return null;

  const nextId = NEXT_SCENARIO_ID[currentId] ?? null;

  return (
    <div className="font-pixel relative h-screen select-none overflow-hidden bg-black text-white">
      <img
        src={screenBg}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
        draggable={false}
      />
      <IncidentGame
        key={`${currentId}:${retryCount}`}
        scenario={scenario}
        onExit={() => void navigate({ to: '/home', search: {} })}
        onNextMission={
          nextId
            ? () => {
                setRetryCount(0);
                void navigate({ to: '/incident', search: { scenarioId: nextId } });
              }
            : null
        }
        onRetry={() => setRetryCount((n) => n + 1)}
        onScenarioClear={onScenarioClear}
        renderDictionaryModal={renderDictionaryModal}
      />
    </div>
  );
}
