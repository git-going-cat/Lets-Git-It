import { useEffect, useRef } from 'react';

import { useModal } from '@/shared/hooks/useModal';

import type { Card } from '../types/incident.types';

interface CardMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  cardIndex: number;
  totalCards: number;
}

export default function CardMissionModal({
  isOpen,
  onClose,
  card,
  cardIndex,
  totalCards,
}: CardMissionModalProps) {
  const { containerRef } = useModal({ isOpen });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => btnRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-mission-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="nes-container is-dark with-title w-full max-w-md"
      >
        <p className="title text-base" id="card-mission-title">
          MISSION {card.scenarioId} - {cardIndex + 1}/{totalCards}
        </p>
        <div className="flex flex-col gap-3 p-1">
          <p className="text-2xl font-bold text-yellow-400">{card.title}</p>
          <p className="whitespace-pre-line text-lg leading-relaxed text-white/90">
            {card.narrative}
          </p>
          <button
            ref={btnRef}
            type="button"
            className="nes-btn is-success w-full !text-lg"
            onClick={onClose}
          >
            ▶ 임무 시작
          </button>
        </div>
      </div>
    </div>
  );
}
