import { useState } from 'react';
import { useAtomValue } from 'jotai';

import {
  coopCommandsAtom,
  coopMyCommandAtom,
  coopMyCommandOrderAtom,
} from '../store/coopCommandsAtom';

const cardBackModules = import.meta.glob('/src/assets/game/coop/coop_card_back_*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

const cardBackImages = Object.entries(cardBackModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([, src]) => src as string);

function CardBack({ cardIndex }: { cardIndex: number }) {
  const [hasImageError, setHasImageError] = useState(false);
  const cardBackImage = cardBackImages[cardIndex % cardBackImages.length];

  if (!cardBackImage || hasImageError) {
    return (
      <div className="h-44 w-28 rounded-sm border-2 border-dotted border-[#05AFF2] bg-[#1a1d3a]" />
    );
  }

  return (
    <img
      src={cardBackImage}
      alt="카드 뒷면"
      className="h-44 w-28 object-contain [image-rendering:pixelated]"
      onError={() => setHasImageError(true)}
    />
  );
}

export default function CoopCardArea() {
  const commands = useAtomValue(coopCommandsAtom);
  const myCommand = useAtomValue(coopMyCommandAtom);
  const myCommandOrder = useAtomValue(coopMyCommandOrderAtom);
  const cardOrders =
    commands.length > 0 ? commands.map((command) => command.commandOrder) : [1, 2, 3, 4];

  return (
    <section className="pointer-events-none z-20 flex w-full items-center justify-center">
      <div className="flex items-center justify-center gap-4">
        {cardOrders.map((commandOrder, cardIndex) => {
          const isMyCard = myCommandOrder === commandOrder && myCommand;

          return (
            <div key={commandOrder} className="relative h-44 w-28">
              {isMyCard ? (
                <div className="flex h-44 w-28 items-center justify-center rounded-sm border-2 border-dotted border-[#76BF41] bg-[#101827] p-3 font-mono text-xs leading-5 text-white shadow-lg">
                  {myCommand}
                </div>
              ) : (
                <CardBack cardIndex={cardIndex} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
