import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { CHARACTER_OPTIONS, useCharacterSetup } from '../hooks/useCharacterSetup';
import { getHairColorOptions, getOutfitColorOptions } from '../utils/characterAssets';

import CharacterPreview from './CharacterPreview';

interface CharacterSetupProps {
  onComplete: () => void;
}

export default function CharacterSetup({ onComplete }: CharacterSetupProps) {
  const { form, isSaving, apiError, onSubmit } = useCharacterSetup(onComplete);
  const { watch, setValue, handleSubmit } = form;

  const values = watch();

  // 헤어 스타일이 바뀌면 해당 스타일에 없는 색상은 01로 클램핑
  useEffect(() => {
    const options = getHairColorOptions(values.characterHair);
    if (!options.find((o) => o.id === values.characterHairColor)) {
      setValue('characterHairColor', options[0].id);
    }
  }, [values.characterHair, values.characterHairColor, setValue]);

  // 복장 스타일이 바뀌면 해당 스타일에 없는 색상은 01로 클램핑
  useEffect(() => {
    const options = getOutfitColorOptions(values.characterOutfit);
    if (!options.find((o) => o.id === values.characterOutfitColor)) {
      setValue('characterOutfitColor', options[0].id);
    }
  }, [values.characterOutfit, values.characterOutfitColor, setValue]);

  // 색상 옵션은 현재 선택된 스타일에 맞게 동적으로 계산
  const rows = [
    { key: 'characterHair' as const, label: '헤어', options: CHARACTER_OPTIONS.hair },
    {
      key: 'characterHairColor' as const,
      label: '헤어 색',
      options: getHairColorOptions(values.characterHair),
    },
    { key: 'characterBody' as const, label: '피부', options: CHARACTER_OPTIONS.body },
    { key: 'characterEye' as const, label: '눈', options: CHARACTER_OPTIONS.eye },
    { key: 'characterOutfit' as const, label: '복장', options: CHARACTER_OPTIONS.outfit },
    {
      key: 'characterOutfitColor' as const,
      label: '복장 색',
      options: getOutfitColorOptions(values.characterOutfit),
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-white/50 text-xs text-center">원하는 캐릭터를 꾸며보세요!</p>

      <div className="flex gap-4 items-center">
        {/* 캐릭터 미리보기 */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className="rounded-lg border border-white/10 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', padding: '12px' }}
          >
            <CharacterPreview values={values} />
          </div>
        </div>

        {/* 파츠 선택 영역: < 현재값 > 화살표 네비게이션 */}
        <div className="flex flex-col gap-2 flex-1 justify-center">
          {rows.map(({ key, label, options }) => {
            const idx = options.findIndex((o) => o.id === values[key]);
            const safeIdx = idx === -1 ? 0 : idx;
            const currentLabel = options[safeIdx]?.label ?? '-';

            const toPrev = () =>
              setValue(key, options[(safeIdx - 1 + options.length) % options.length].id);
            const toNext = () => setValue(key, options[(safeIdx + 1) % options.length].id);

            return (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="text-white/40 text-[10px] leading-none pl-0.5">{label}</span>
                <div className="flex items-center bg-white/5 rounded px-1 py-1 gap-1">
                  <button
                    type="button"
                    onClick={toPrev}
                    className="text-white/50 hover:text-white transition-colors p-1 rounded hover:bg-white/10 shrink-0"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <span className="text-white/90 text-xs font-medium text-center truncate w-full select-none leading-tight">
                      {currentLabel}
                    </span>
                    <span className="text-white/30 text-[10px] select-none leading-tight">
                      {safeIdx + 1} / {options.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toNext}
                    className="text-white/50 hover:text-white transition-colors p-1 rounded hover:bg-white/10 shrink-0"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {apiError && <p className="text-red-400 text-xs">{apiError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 rounded text-sm font-semibold transition-colors border-none! bg-white/10! hover:bg-white/20! text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isSaving ? '저장 중...' : '다음'}
        </button>
      </div>
    </form>
  );
}
