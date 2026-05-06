import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveCharacterAsset } from '../api/mypageApi';

import type { CharacterAsset, CharacterSelectState } from '../types/mypage.types';

export function useEditCharacter(initialAsset: CharacterAsset, onClose?: () => void) {
  const [selected, setSelected] = useState<CharacterSelectState>(initialAsset);
  const queryClient = useQueryClient();

  const isDirty = useMemo(
    () =>
      Object.keys(initialAsset).some((key) => {
        const field = key as keyof CharacterAsset;
        return initialAsset[field] !== selected[field];
      }),
    [initialAsset, selected]
  );

  const handleSelect = (field: keyof CharacterAsset, value: string) => {
    setSelected((prev) => ({ ...prev, [field]: value }));
  };

  const resetSelected = () => {
    setSelected(initialAsset);
  };

  const closeWithReset = () => {
    resetSelected();
    onClose?.();
  };

  const saveCharacterMutation = useMutation({
    mutationFn: (asset: CharacterAsset) => saveCharacterAsset(asset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRecord'] });
    },
  });

  return {
    selected,
    handleSelect,
    resetSelected,
    closeWithReset,
    saveCharacterMutation,
    isDirty,
  };
}
