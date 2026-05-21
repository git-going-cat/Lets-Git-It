import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/authStore';

import { saveCharacterAsset } from '../api/mypageApi';
import { MYPAGE_QUERY_KEYS } from '../constants/queryKeys';

import type { CharacterAsset, CharacterSelectState } from '../types/mypage.types';

/**
 * 캐릭터 커스터마이징 선택 상태와 저장 요청을 관리합니다.
 */
export function useEditCharacter(initialAsset: CharacterAsset, onClose?: () => void) {
  const [selected, setSelected] = useState<CharacterSelectState>(initialAsset);
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

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
    onSuccess: (_, asset) => {
      updateUser(asset);
      queryClient.invalidateQueries({ queryKey: MYPAGE_QUERY_KEYS.myRecord });
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
