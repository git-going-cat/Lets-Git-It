import { useAtomValue } from 'jotai';

import { comboAtom } from '../store/comboAtom';

export default function HUDCombo() {
  const combo = useAtomValue(comboAtom);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-bold">{combo}</span>
    </div>
  );
}
