import { useAtomValue } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom } from '../store/gameStatusAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';

const ITEM_LABELS: [string, string, string] = ['stash', 'cherry-pick', 'restore'];

export default function HUDItemSlots() {
  const itemSlots = useAtomValue(itemSlotsAtom);
  const isPlaying = useAtomValue(gameStatusAtom) === 'playing';

  return (
    <div className="font-pixel flex w-full flex-col items-center gap-3">
      {itemSlots.map((active, i) => (
        <button
          key={i}
          type="button"
          className={`nes-btn w-full !text-xl ${active && isPlaying ? 'is-primary' : 'is-disabled'}`}
          disabled={!active || !isPlaying}
          onClick={() => EventBus.emit('item:click', { slot: i as 0 | 1 | 2 })}
        >
          <div className="!text-xl">Alt+{i + 1}</div>
          <div className="!text-xl">{ITEM_LABELS[i]}</div>
        </button>
      ))}
    </div>
  );
}
