import { useMemo, useState } from 'react';

import { useDictionary } from './useDictionary';

import type { Command } from '../types/dictionary.types';

export type DictionaryUsageFilter = 'all' | 'inGame' | 'outGame';

export function useDictionaryModal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<DictionaryUsageFilter>('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const { data: commands, error, isError, isLoading } = useDictionary();

  const filteredCommands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!commands) return [];

    return commands.filter((cmd) => {
      const matchesQuery = !normalizedQuery || cmd.name.toLowerCase().includes(normalizedQuery);
      const matchesUsage =
        usageFilter === 'all' ||
        (usageFilter === 'inGame' && cmd.isInGame) ||
        (usageFilter === 'outGame' && !cmd.isInGame);

      return matchesQuery && matchesUsage;
    });
  }, [commands, searchQuery, usageFilter]);

  return {
    searchQuery,
    setSearchQuery,
    usageFilter,
    setUsageFilter,
    selectedCommand,
    setSelectedCommand,
    filteredCommands,
    isLoading,
    isError,
    error,
  };
}
