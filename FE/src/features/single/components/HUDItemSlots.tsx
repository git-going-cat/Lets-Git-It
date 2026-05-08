import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom } from '../store/gameStatusAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';

const ITEM_LABELS: [string, string, string] = ['stash', 'cherry-pick', 'restore'];

export default function HUDItemSlots() {
  const itemSlots = useAtomValue(itemSlotsAtom);
  const isPlaying = useAtomValue(gameStatusAtom) === 'playing';
  const [popKeys, setPopKeys] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    const handler = ({ slot }: { slot: 0 | 1 | 2 }) => {
      setPopKeys((prev) => {
        const next = [...prev] as [number, number, number];
        next[slot] += 1;
        return next;
      });
    };
    EventBus.on('item:acquired', handler);
    return () => {
      EventBus.off('item:acquired', handler);
    };
  }, []);

  return (
    <div className="font-pixel flex w-full flex-col items-center gap-3">
      {itemSlots.map((active, i) => (
        <span
          key={`${i}-${popKeys[i]}`}
          className={`block w-full${popKeys[i] > 0 ? ' animate-item-pop' : ''}`}
        >
          <button
            type="button"
            className={`nes-btn w-full !text-2xl ${active && isPlaying ? 'is-primary' : 'is-disabled'}`}
            disabled={!active || !isPlaying}
            onClick={() => EventBus.emit('item:click', { slot: i as 0 | 1 | 2 })}
          >
            <div className="!text-2xl">Alt+{i + 1}</div>
            <div className="!text-2xl">{ITEM_LABELS[i]}</div>
          </button>
        </span>
      ))}
    </div>
  );
}
