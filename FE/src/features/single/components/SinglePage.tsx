import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Provider } from 'jotai';

import { singleApi } from '../api/singleApi';
import { useSinglePageGuards } from '../hooks/useSinglePageGuards';
import { useSingleStore } from '../store/singleStore';

import PauseModal from './PauseModal';
import ResultModal from './ResultModal';
import SingleGameContent from './SingleGameContent';
import StartModal from './StartModal';

export default function SinglePage() {
  useSinglePageGuards();
  const navigate = useNavigate();
  const { difficulty } = useSearch({ from: '/single' });

  useEffect(() => {
    if (!difficulty) return;

    let cancelled = false;

    singleApi
      .startSession(difficulty)
      .then((data) => {
        if (!cancelled) useSingleStore.getState().setSession(data);
      })
      .catch(() => {
        if (!cancelled) void navigate({ to: '/home', replace: true });
      });

    return () => {
      cancelled = true;
      useSingleStore.getState().clearSession();
    };
  }, [difficulty, navigate]);

  return (
    <Provider>
      <div className="font-pixel">
        <SingleGameContent />
        <StartModal />
        <PauseModal />
        <ResultModal />
      </div>
    </Provider>
  );
}
