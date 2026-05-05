import { useAtomValue } from 'jotai';

import { comboAtom } from '../store/comboAtom';

export default function HUDCombo() {
  const combo = useAtomValue(comboAtom);

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <span className={`text-3xl ${combo > 0 ? 'nes-text is-warning' : 'text-gray-600'}`}>
        x{combo}
      </span>
    </div>
  );
}
