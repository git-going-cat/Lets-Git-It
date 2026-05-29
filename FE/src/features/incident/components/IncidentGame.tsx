import { useCallback, useEffect, useRef, useState } from 'react';

import { analytics } from '@/lib/analytics';
import PauseModal from '@/shared/components/PauseModal';

import { useIncidentGame } from '../hooks/useIncidentGame';

import CardMissionModal from './CardMissionModal';
import CatPanel from './CatPanel';
import InputRow from './InputRow';
import NarrativeStrip from './NarrativeStrip';
import ScenarioIntroModal from './ScenarioIntroModal';
import ScenarioResultModal from './ScenarioResultModal';
import TopBar from './TopBar';
import Visualization from './Visualization';

import type { CatMood, Scenario } from '../types/incident.types';
import type { ReactNode } from 'react';

interface IncidentGameProps {
  scenario: Scenario;
  onExit: () => void;
  onNextMission: (() => void) | null;
  onRetry: () => void;
  onScenarioClear: (scenarioId: number) => void;
  renderDictionaryModal: (onClose: () => void) => ReactNode;
}

export default function IncidentGame({
  scenario,
  onExit,
  onNextMission,
  onRetry,
  onScenarioClear,
  renderDictionaryModal,
}: IncidentGameProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [showMission, setShowMission] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [inputFocusTrigger, setInputFocusTrigger] = useState(0);
  const scenarioStartedAtRef = useRef<number>(0);

  const handleComplete = useCallback(
    () => onScenarioClear(scenario.id),
    [onScenarioClear, scenario.id]
  );

  const {
    card,
    cardIndex,
    totalCards,
    input,
    phase,
    scored,
    history,
    viz,
    flying,
    showHint,
    aiCoachingLoading,
    aiCoachingMessage,
    setInput,
    toggleHint,
    refine,
    finalize,
    next,
  } = useIncidentGame(scenario.cards, handleComplete);

  const handleStart = () => {
    scenarioStartedAtRef.current = Date.now();
    analytics.incidentScenarioStarted({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      cardCount: totalCards,
    });
    setShowIntro(false);
    setShowMission(true);
    scenarioStartedAtRef.current = Date.now();
    analytics.incidentScenarioStarted({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      cardCount: scenario.cards.length,
    });
  };

  const handleNext = () => {
    if (cardIndex === totalCards - 1) {
      const durationMs =
        scenarioStartedAtRef.current > 0 ? Date.now() - scenarioStartedAtRef.current : 0;
      const scoreMap = history.reduce<Record<string, number>>((acc, h) => {
        acc[h.cardId] = Math.max(acc[h.cardId] ?? 0, h.score);
        return acc;
      }, {});
      if (scored) scoreMap[card.id] = Math.max(scoreMap[card.id] ?? 0, scored.total);
      const totalScore = Object.values(scoreMap).reduce((sum, s) => sum + s, 0);
      analytics.incidentScenarioCompleted({
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        cardCount: totalCards,
        totalScore,
        maxScore: totalCards * 100,
        durationMs,
      });
      next();
      setShowResult(true);
    } else {
      next();
      setShowMission(true);
    }
    setShowAnswer(false);
  };

  const handleExit = () => {
    if (!showResult) {
      const durationMs =
        scenarioStartedAtRef.current > 0 ? Date.now() - scenarioStartedAtRef.current : 0;
      analytics.incidentScenarioAbandoned({
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        currentCardIndex: cardIndex,
        cardCount: totalCards,
        durationMs,
      });
    }
    onExit();
  };

  const handleRetry = () => {
    setInput('');
    refine();
    setShowAnswer(false);
  };

  const handleShowAnswer = () => setShowAnswer(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showPause || showResult) return;
      setShowPause(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPause, showResult]);

  const currentBranch = (() => {
    const raw = viz.commits.find((c) => c.current)?.branch ?? '';
    return raw.match(/HEAD\s*→\s*([^\s·]+)/)?.[1] ?? 'main';
  })();

  const catMood: CatMood = !scored
    ? 'idle'
    : scored.status === 'forbidden'
      ? 'forbidden'
      : scored.status === 'perfect' || scored.status === 'accepted'
        ? 'perfect'
        : 'partial';

  const coachingText = (() => {
    if (phase !== 'scored' || !scored) return null;
    if (scored.status === 'perfect' || scored.status === 'accepted') return null;
    if (scored.status === 'lower-retry') return card.explanation ?? null;
    if (aiCoachingLoading) return null;
    if (aiCoachingMessage) return aiCoachingMessage;
    return scored.coaching ?? null;
  })();

  const canonicalReveal =
    coachingText || showAnswer ? { command: card.canonical, label: card.canonicalLabel } : null;

  return (
    <div className="relative flex h-full overflow-hidden">
      {showIntro && <ScenarioIntroModal scenario={scenario} onStart={handleStart} />}
      <PauseModal isOpen={showPause} onResume={() => setShowPause(false)} onExit={handleExit} />
      {showDictionary && renderDictionaryModal(() => setShowDictionary(false))}
      {showResult && (
        <ScenarioResultModal
          cards={scenario.cards}
          scores={history.reduce<Record<string, number>>((acc, h) => {
            acc[h.cardId] = Math.max(acc[h.cardId] ?? 0, h.score);
            return acc;
          }, {})}
          onExit={handleExit}
          onNextMission={onNextMission}
          onRetry={onRetry}
        />
      )}
      {!showIntro && !showResult && (
        <CardMissionModal
          isOpen={showMission}
          onClose={() => {
            setShowMission(false);
            setInputFocusTrigger((n) => n + 1);
          }}
          card={card}
          cardIndex={cardIndex}
          totalCards={totalCards}
        />
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden bg-[#212529] px-6 pb-4 pt-3">
        <TopBar
          scenarioId={scenario.id}
          scenarioTitle={scenario.title}
          difficulty={scenario.difficulty}
          stepIdx={cardIndex}
          total={totalCards}
          cardTitle={card.title}
        />

        <NarrativeStrip narrative={card.narrative} />

        <div className="min-h-0 flex-1">
          <Visualization viz={viz} flying={flying} />
        </div>

        <InputRow
          input={input}
          setInput={setInput}
          phase={phase}
          onFinalize={finalize}
          onRetry={handleRetry}
          onShowAnswer={handleShowAnswer}
          onNext={handleNext}
          scored={scored}
          history={history}
          isLastCard={cardIndex === totalCards - 1}
          focusTrigger={inputFocusTrigger}
          currentBranch={currentBranch}
          aiCoachingLoading={aiCoachingLoading}
        />
      </div>

      <CatPanel
        catMood={catMood}
        moodIdleText={card.moodIdle}
        moodPerfectText={card.moodPerfect}
        coaching={coachingText}
        canonical={canonicalReveal}
        hintText={card.hint}
        showHint={showHint}
        showAnswer={showAnswer}
        explanation={card.explanation}
        onHintToggle={toggleHint}
        onDictionary={() => setShowDictionary(true)}
        onPause={() => setShowPause(true)}
      />
    </div>
  );
}
