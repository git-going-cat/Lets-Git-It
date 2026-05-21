import { useAtomValue } from 'jotai';

import { comboAtom } from '@/shared/store/comboAtom';

import { useGradePrediction } from '../hooks/useGradePrediction';

export default function HUDCombo() {
  const combo = useAtomValue(comboAtom);
  const predictedGrade = useGradePrediction();

  return (
    <div className="font-pixel flex flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-2">
        <span className="text-base text-gray-500">콤보</span>
        <span
          key={combo}
          className={`text-7xl ${combo > 0 ? 'combo-pop nes-text is-success' : 'text-gray-600'}`}
        >
          x{combo}
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-base text-gray-500">예측 등급</span>
        <span className={`text-7xl ${predictedGrade ? 'nes-text is-success' : 'text-gray-600'}`}>
          {predictedGrade ?? '-'}
        </span>
      </div>
    </div>
  );
}
