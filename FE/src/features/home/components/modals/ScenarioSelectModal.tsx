import { useModal } from '@/shared/hooks/useModal';

import type { Scenario } from '@/features/incident/types/incident.types';

// ── 타입 ──────────────────────────────────────────────────

interface ScenarioSelectModalProps {
  onClose: () => void;
  /** routes/-HomeRoute에서 SCENARIOS를 주입받는다. cross-feature 직접 import 차단. */
  incidentScenarios: Scenario[];
  /** routes/-HomeRoute에서 useIncidentProgress.isCleared를 바인딩해 주입. */
  isIncidentCleared: (scenarioId: number) => boolean;
  /** BE API 준비 전 undefined → 버튼 "준비 중" + disabled 처리 */
  onStartScenario?: (scenarioId: number) => Promise<void>;
}

// ── 잠금 정책 ─────────────────────────────────────────────
// 시나리오 1은 항상 해금. 시나리오 4는 1 클리어 후 해금. 2·3은 미구현 잠금.

// 미구현 placeholder: ScenarioSelectModal UI 구성 전용. 실제 카드 없음.
const UNIMPLEMENTED_PLACEHOLDERS = [
  {
    id: 2,
    title: '잘못된 머지',
    difficulty: 2 as const,
    synopsis: '엉뚱한 브랜치에 머지해버렸어요',
    cards: [],
  },
  {
    id: 3,
    title: '히스토리 분실',
    difficulty: 3 as const,
    synopsis: '커밋 히스토리가 뒤죽박죽이에요',
    cards: [],
  },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────

/**
 * 고양이 사고처리반 시나리오 선택 모달.
 * Win11ExplorerModal 위에 z-60으로 쌓인다 (Win11ExplorerModal은 z-50).
 * 잠긴 시나리오는 클릭 불가 + aria-disabled.
 */
export default function ScenarioSelectModal({
  onClose,
  incidentScenarios,
  isIncidentCleared,
  onStartScenario,
}: ScenarioSelectModalProps) {
  const { containerRef } = useModal({ isOpen: true, onClose });

  const allScenarios = [...incidentScenarios, ...UNIMPLEMENTED_PLACEHOLDERS].sort(
    (a, b) => a.id - b.id
  );

  const isUnlocked = (id: number) => {
    if (id === 1) return true;
    if (id === 4) return isIncidentCleared(1);
    return false;
  };

  const lockedReason = (id: number) =>
    id === 4 ? '사건 #1을 먼저 해결하세요' : '준비 중인 사건입니다';

  const handleSelect = async (scenarioId: number) => {
    if (!onStartScenario) return;
    await onStartScenario(scenarioId);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* 모달 본체 */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="시나리오 선택"
        tabIndex={-1}
        className="relative z-10 flex w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg bg-[#f3f3f3] shadow-2xl ring-1 ring-black/10 outline-none"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#f9f9f9] px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">시나리오 선택</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-500 outline-none! hover:bg-gray-200 focus:outline-none! focus-visible:ring-2 focus-visible:ring-sky-500/40"
            aria-label="닫기"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 시나리오 목록 */}
        <ul className="flex flex-col gap-2 p-4">
          {allScenarios.map((scenario) => {
            const isLocked = !isUnlocked(scenario.id);
            const cleared = isIncidentCleared(scenario.id);
            const isDisabled = isLocked || !onStartScenario;
            return (
              <li key={scenario.id}>
                <button
                  type="button"
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                  title={isLocked ? lockedReason(scenario.id) : undefined}
                  onClick={() => void handleSelect(scenario.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left outline-none! transition-colors focus:outline-none! focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                    isDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-white opacity-40'
                      : 'border-gray-200 bg-white hover:border-[#0078d4]/40 hover:bg-[#e8f4fb]'
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-base">
                    {cleared ? '✓' : isLocked ? '🔒' : '📂'}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        사건 #{scenario.id} · {scenario.title}
                      </span>
                      <span
                        className={`shrink-0 text-xs ${isLocked ? 'text-gray-300' : 'text-yellow-400'}`}
                      >
                        {'★'.repeat(scenario.difficulty)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{scenario.synopsis}</span>
                    <span
                      className={`text-xs ${
                        cleared
                          ? 'font-medium text-green-600'
                          : isLocked
                            ? 'text-gray-400'
                            : 'font-medium text-[#0078d4]'
                      }`}
                    >
                      {cleared ? '클리어!' : isLocked ? '잠김' : '도전 가능'}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 하단 안내 */}
        <p className="border-t border-gray-200 px-5 py-3 text-xs text-gray-400">
          {onStartScenario ? '시나리오를 선택해 게임을 시작하세요.' : 'BE API 준비 중입니다.'}
        </p>
      </div>
    </div>
  );
}
