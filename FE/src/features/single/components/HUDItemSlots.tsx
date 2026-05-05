import { useAtomValue } from 'jotai';

import { itemSlotsAtom } from '../store/itemSlotsAtom';

const ITEM_LABELS: [string, string, string] = ['stash', 'cherry-pick', 'restore'];

export default function HUDItemSlots() {
  const itemSlots = useAtomValue(itemSlotsAtom);

  return (
    <div
      className="flex flex-col items-center gap-3 w-full"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      {itemSlots.map((active, i) => (
        <button
          key={i}
          className={`nes-btn w-full text-[8px] ${active ? 'is-primary' : 'is-disabled'}`}
          disabled={!active}
        >
          <div>Alt+{i + 1}</div>
          <div>{ITEM_LABELS[i]}</div>
        </button>
      ))}
    </div>
  );
}
