import { useAtomValue } from 'jotai';

import { itemSlotsAtom } from '../store/itemSlotsAtom';

const ITEM_LABELS: [string, string, string] = ['stash', 'cherry-pick', 'restore'];

export default function HUDItemSlots() {
  const itemSlots = useAtomValue(itemSlotsAtom);

  return (
    <div className="flex flex-col items-center gap-3">
      {itemSlots.map((active, i) => (
        <div
          key={i}
          className={`w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-1 ${active ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-600 bg-gray-800 opacity-40'}`}
        >
          <span className="text-sm">{'Ctrl+' + (i + 1)}</span>
          <span className="text-sm font-medium">{ITEM_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}
