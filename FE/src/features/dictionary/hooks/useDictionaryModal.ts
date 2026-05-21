import { useMemo, useState } from 'react';

import { useDictionary } from './useDictionary';

import type { Command } from '../types/dictionary.types';

export type DictionaryUsageFilter = 'all' | 'inGame' | 'outGame';

function normalizeSearchText(value: string) {
  return value.normalize('NFC').trim().toLowerCase();
}

/**
 * 명령어 도감 모달의 검색어, 사용처 필터, 선택된 명령어 상태를 관리합니다.
 */
export function useDictionaryModal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [usageFilter, setUsageFilter] = useState<DictionaryUsageFilter>('all');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const { data: commands, error, isError, isLoading } = useDictionary();

  const filteredCommands = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    if (!commands) return [];

    return commands.filter((cmd) => {
      const matchesQuery =
        !normalizedQuery || normalizeSearchText(cmd.name).includes(normalizedQuery);
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
