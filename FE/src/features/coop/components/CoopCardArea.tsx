import { useAtomValue } from 'jotai';

import { coopCommandsAtom } from '../store/coopCommandsAtom';
import { coopPhaseAtom } from '../store/coopPhaseAtom';
import { COOP_CARD_FRONT } from '../utils/coopCardImages';

function CardFront({ commandOrder, commandText }: { commandOrder: number; commandText: string }) {
  return (
    <div className="relative h-44 w-28 flex-shrink-0">
      <img
        src={COOP_CARD_FRONT}
        alt="카드 앞면"
        className="h-full w-full object-contain [image-rendering:pixelated]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#05AFF2] text-xs font-bold text-white">
          {commandOrder}
        </div>
        <code className="break-all text-center font-mono text-xs leading-relaxed text-white drop-shadow-lg">
          {commandText}
        </code>
      </div>
    </div>
  );
}

export default function CoopCardArea() {
  const commands = useAtomValue(coopCommandsAtom);
  const phase = useAtomValue(coopPhaseAtom);
  const cardCommands =
    commands.length > 0
      ? commands
      : [
          { commandOrder: 1, commandText: '' },
          { commandOrder: 2, commandText: '' },
          { commandOrder: 3, commandText: '' },
          { commandOrder: 4, commandText: '' },
        ];

  if (phase !== 'reveal') return null;

  return (
    <section className="pointer-events-none z-20 flex w-full items-center justify-center">
      <div className="flex flex-row items-center justify-center gap-4">
        {cardCommands.map((command) => (
          <CardFront
            key={command.commandOrder}
            commandOrder={command.commandOrder}
            commandText={command.commandText}
          />
        ))}
      </div>
    </section>
  );
}
