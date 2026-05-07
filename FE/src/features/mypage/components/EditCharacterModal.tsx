import { useState } from 'react';
import { createPortal } from 'react-dom';

import CharacterPreview from '@/features/auth/components/CharacterPreview';
import { getHairColorOptions, getOutfitColorOptions } from '@/features/auth/utils/characterAssets';
import { Win11Window } from '@/shared/components/Win11Window';

import { BODY_ASSETS, EYE_ASSETS, HAIR_ASSETS, OUTFIT_ASSETS } from '../constants/characterAssets';
import { useEditCharacter } from '../hooks/useEditCharacter';

import AssetSelector from './AssetSelector';

import type { EditCharacterModalProps } from '../types/mypage.types';
import type { ReactNode } from 'react';

type SaveNotice = 'success' | 'error' | null;

export default function EditCharacterModal({
  isOpen,
  onClose,
  currentAsset,
}: EditCharacterModalProps) {
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(null);
  const { selected, handleSelect, closeWithReset, saveCharacterMutation, isDirty } =
    useEditCharacter(currentAsset, onClose);

  if (!isOpen) return null;

  const hairColorAssets = getHairColorOptions(selected.characterHair).map((asset) => asset.id);
  const outfitColorAssets = getOutfitColorOptions(selected.characterOutfit).map(
    (asset) => asset.id
  );

  const handleHairChange = (id: string) => {
    handleSelect('characterHair', id);
    const nextColors = getHairColorOptions(id).map((asset) => asset.id);
    const nextColor = nextColors[0];
    if (!nextColors.includes(selected.characterHairColor) && nextColor) {
      handleSelect('characterHairColor', nextColor);
    }
  };

  const handleOutfitChange = (id: string) => {
    handleSelect('characterOutfit', id);
    const nextColors = getOutfitColorOptions(id).map((asset) => asset.id);
    const nextColor = nextColors[0];
    if (!nextColors.includes(selected.characterOutfitColor) && nextColor) {
      handleSelect('characterOutfitColor', nextColor);
    }
  };

  const handleSave = () => {
    if (!isDirty || saveCharacterMutation.isPending) return;
    saveCharacterMutation.mutate(selected, {
      onSuccess: () => setSaveNotice('success'),
      onError: () => setSaveNotice('error'),
    });
  };

  const handleSuccessConfirm = () => {
    setSaveNotice(null);
    onClose();
  };

  return (
    <Win11Window
      title="캐릭터 수정"
      onClose={closeWithReset}
      glass
      // 랭킹 모달의 하늘색-분홍색 그라디언트와 동일한 톤을 사용하기 위한 arbitrary gradient입니다.
      className="max-h-[92vh] border-none bg-[linear-gradient(160deg,#7ECFEA_0%,#9DDAF0_35%,#C5EDF8_65%,#E8C4C4_100%)]"
    >
      {/* w-[860px]: 캐릭터 미리보기와 6개 선택 행을 한 화면에 안정적으로 배치하기 위한 모달 고정 폭 */}
      <div className="flex w-[860px] max-w-[calc(100vw-3rem)] flex-col gap-6">
        <div className="flex gap-6">
          <section className="flex w-80 flex-col gap-4">
            <div className="relative flex h-80 w-full flex-col items-center justify-center rounded-xl border border-white/60 bg-[rgba(255,255,255,0.72)] shadow-lg backdrop-blur-md">
              <CharacterPreview values={selected} className="h-64 w-32" />
            </div>
            <div className="text-center text-lg font-bold tracking-widest text-[#3a5a8a]">
              PREVIEW
            </div>
          </section>

          <section className="flex flex-1 flex-col gap-5">
            <CharacterSection title="BODY">
              <AssetSelector
                label="BODY"
                hideLabel
                assetIds={BODY_ASSETS}
                currentId={selected.characterBody}
                onChange={(id) => handleSelect('characterBody', id)}
              />
            </CharacterSection>

            <CharacterSection title="EYES">
              <AssetSelector
                label="EYES"
                hideLabel
                assetIds={EYE_ASSETS}
                currentId={selected.characterEye}
                onChange={(id) => handleSelect('characterEye', id)}
              />
            </CharacterSection>

            <CharacterSection title="HAIRSTYLE">
              <div className="flex flex-col justify-center gap-3">
                <AssetSelector
                  label="HAIRSTYLE"
                  hideLabel
                  assetIds={HAIR_ASSETS}
                  currentId={selected.characterHair}
                  onChange={handleHairChange}
                />
                <AssetSelector
                  label="HAIRSTYLE COLOR"
                  hideLabel
                  assetIds={hairColorAssets}
                  currentId={selected.characterHairColor}
                  onChange={(id) => handleSelect('characterHairColor', id)}
                />
              </div>
            </CharacterSection>

            <CharacterSection title="OUTFIT">
              <div className="flex flex-col justify-center gap-3">
                <AssetSelector
                  label="OUTFIT"
                  hideLabel
                  assetIds={OUTFIT_ASSETS}
                  currentId={selected.characterOutfit}
                  onChange={handleOutfitChange}
                />
                <AssetSelector
                  label="OUTFIT COLOR"
                  hideLabel
                  assetIds={outfitColorAssets}
                  currentId={selected.characterOutfitColor}
                  onChange={(id) => handleSelect('characterOutfitColor', id)}
                />
              </div>
            </CharacterSection>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/50 pt-4">
          <button
            type="button"
            onClick={closeWithReset}
            className="rounded-lg border border-[rgba(140,170,210,0.35)] bg-[rgba(255,255,255,0.72)] px-6 py-2.5 text-sm font-bold text-[#5a6a8a] shadow-sm transition-all hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saveCharacterMutation.isPending}
            className="rounded-lg bg-[#3a5a8a] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2f4c78] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveCharacterMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {saveNotice && (
        <CharacterSaveNotice
          type={saveNotice}
          onConfirm={saveNotice === 'success' ? handleSuccessConfirm : () => setSaveNotice(null)}
        />
      )}
    </Win11Window>
  );
}

interface CharacterSectionProps {
  title: string;
  children: ReactNode;
}

function CharacterSection({ title, children }: CharacterSectionProps) {
  return (
    <div className="relative rounded-xl border border-white/60 bg-[rgba(255,255,255,0.72)] p-4 pt-5 shadow-lg backdrop-blur-md">
      <span className="absolute -top-3 left-4 rounded-full bg-[#E8F6FB] px-2 text-sm font-bold tracking-wide text-[#3a5a8a]">
        {title}
      </span>
      {children}
    </div>
  );
}

interface CharacterSaveNoticeProps {
  type: Exclude<SaveNotice, null>;
  onConfirm: () => void;
}

function CharacterSaveNotice({ type, onConfirm }: CharacterSaveNoticeProps) {
  const isSuccess = type === 'success';

  return createPortal(
    <div
      // z-[130]: 저장 결과 알림을 캐릭터 편집 모달과 공통 확인 모달보다 위에 표시합니다.
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35"
    >
      <div className="w-80 rounded-xl border border-white/70 bg-[rgba(255,255,255,0.9)] p-5 text-center shadow-2xl backdrop-blur-md">
        <h3 className="text-base font-bold text-[#3a5a8a]">
          {isSuccess ? '캐릭터 변경 완료' : '캐릭터 변경 실패'}
        </h3>
        <p className="mt-3 text-sm font-medium text-gray-700">
          {isSuccess
            ? '캐릭터가 성공적으로 변경되었습니다.'
            : '캐릭터 변경에 실패했습니다. 다시 시도해 주세요.'}
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 rounded-lg bg-[#3a5a8a] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f4c78]"
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
}
