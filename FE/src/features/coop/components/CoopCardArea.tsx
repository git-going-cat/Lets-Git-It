import { useAtomValue } from 'jotai';

import { coopCommandsAtom, coopMyCommandAtom } from '../store/coopCommandsAtom';
import { coopPhaseAtom } from '../store/coopPhaseAtom';
import { COOP_CARD_FRONT } from '../utils/coopCardImages';

function CardFront({
  commandOrder,
  commandText,
}: {
  commandOrder: number | null;
  commandText: string;
}) {
  return (
    <div className="relative h-64 w-40 flex-shrink-0">
      <img
        src={COOP_CARD_FRONT}
        alt="카드 앞면"
        className="h-full w-full object-contain [image-rendering:pixelated]"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 p-4">
        {commandOrder !== null && (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#05AFF2] text-sm font-bold text-white">
            {commandOrder}
          </div>
        )}
        <code className="break-all text-center font-mono text-sm leading-relaxed text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          {commandText}
        </code>
      </div>
    </div>
  );
}

export default function CoopCardArea() {
  const commands = useAtomValue(coopCommandsAtom);
  const myCommand = useAtomValue(coopMyCommandAtom);
  const phase = useAtomValue(coopPhaseAtom);

  if (phase === 'assign' && myCommand) {
    return (
      <section className="pointer-events-none z-20 flex w-full items-center justify-center">
        <CardFront commandOrder={null} commandText={myCommand} />
      </section>
    );
  }

  if (phase !== 'reveal' || commands.length === 0) return null;

  return (
    <section className="pointer-events-none z-20 flex w-full items-center justify-center">
      <div className="flex flex-row items-center justify-center gap-6">
        {commands.map((command, index) => (
          <CardFront
            key={`${command.commandOrder}-${index}`}
            commandOrder={command.commandOrder}
            commandText={command.commandText}
          />
        ))}
      </div>
    </section>
  );
}
