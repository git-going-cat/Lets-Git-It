import { useMemo, useState } from 'react';

import { useDictionary } from './useDictionary';

import type { Command } from '../types/dictionary.types';

export function useDictionaryModal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const { data: commands, isLoading } = useDictionary();

  const filteredCommands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!commands) return [];
    if (!normalizedQuery) return commands;

    return commands.filter((cmd) => cmd.name.toLowerCase().includes(normalizedQuery));
  }, [commands, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCommand,
    setSelectedCommand,
    filteredCommands,
    isLoading,
  };
}
