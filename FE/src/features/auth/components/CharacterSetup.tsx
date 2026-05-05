import { CHARACTER_OPTIONS, useCharacterSetup } from '../hooks/useCharacterSetup';

interface CharacterSetupProps {
  onComplete: () => void;
}

/**
 * 캐릭터 설정 단계.
 * 헤어·컬러·눈·복장 등 각 파츠를 선택하고 저장 후 onComplete를 호출합니다.
 * (실제 에셋 준비 전까지 색상 스와치로 파츠를 시각화합니다.)
 */
export default function CharacterSetup({ onComplete }: CharacterSetupProps) {
  const { form, isSaving, apiError, onSubmit } = useCharacterSetup(onComplete);
  const { watch, setValue, handleSubmit } = form;

  const values = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-white/50 text-xs text-center">원하는 캐릭터를 꾸며보세요!</p>

      {/* 캐릭터 미리보기 (에셋 없을 때 플레이스홀더) */}
      <div className="flex justify-center">
        <div
          className="w-20 h-28 rounded-lg border border-white/10 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-3xl">🧑‍💻</span>
        </div>
      </div>

      {/* 파츠 선택 영역 */}
      <div className="flex flex-col gap-3 overflow-y-auto max-h-48 pr-1">
        {(
          [
            { key: 'characterHair', label: '헤어', options: CHARACTER_OPTIONS.hair },
            { key: 'characterHairColor', label: '헤어 색', options: CHARACTER_OPTIONS.hairColor },
            { key: 'characterBody', label: '피부', options: CHARACTER_OPTIONS.body },
            { key: 'characterEye', label: '눈', options: CHARACTER_OPTIONS.eye },
            { key: 'characterOutfit', label: '복장', options: CHARACTER_OPTIONS.outfit },
            {
              key: 'characterOutfitColor',
              label: '복장 색',
              options: CHARACTER_OPTIONS.outfitColor,
            },
          ] as const
        ).map(({ key, label, options }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-white/50 text-xs w-14 shrink-0">{label}</span>
            <div className="flex gap-1.5 flex-wrap">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.label}
                  onClick={() => setValue(key, opt.id)}
                  className="w-6 h-6 rounded-full border-2 transition-all border-none!"
                  style={{
                    background: opt.color,
                    outline: values[key] === opt.id ? `2px solid white` : undefined,
                    outlineOffset: values[key] === opt.id ? '2px' : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
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
