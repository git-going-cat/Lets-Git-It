import { useAtomValue } from 'jotai';

import { itemSlotsAtom } from '../store/itemSlotsAtom';

const ITEM_LABELS: [string, string, string] = ['stash', 'cherry-pick', 'restore'];

export default function HUDItemSlots() {
  const itemSlots = useAtomValue(itemSlotsAtom);

  return (
    <div className="font-pixel flex w-full flex-col items-center gap-3">
      {itemSlots.map((active, i) => (
        <button
          key={i}
          className={`nes-btn w-full !text-xl ${active ? 'is-primary' : 'is-disabled'}`}
          disabled={!active}
        >
          <div className="!text-xl">Alt+{i + 1}</div>
          <div className="!text-xl">{ITEM_LABELS[i]}</div>
        </button>
      ))}
    </div>
  );
}
