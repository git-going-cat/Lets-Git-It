import { useAtomValue } from 'jotai';

import { comboAtom } from '../store/comboAtom';

export default function HUDCombo() {
  const combo = useAtomValue(comboAtom);

  return (
    <div className="font-pixel flex flex-col items-center gap-3">
      <span
        key={combo}
        className={`text-5xl ${combo > 0 ? 'combo-pop nes-text is-success' : 'text-gray-600'}`}
      >
        x{combo}
      </span>
    </div>
  );
}
