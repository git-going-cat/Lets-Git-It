import { useAtomValue } from 'jotai';

import {
  coopCommandsAtom,
  coopMyCommandAtom,
  coopMyCommandCompletedAtom,
} from '../store/coopCommandsAtom';
import { coopPhaseAtom } from '../store/coopPhaseAtom';
import { COOP_CARD_BACKS } from '../utils/coopCardImages';

const SHUFFLE_CLASSES = [
  'animate-[coop-card-shuffle-a_900ms_ease-in-out_infinite]',
  'animate-[coop-card-shuffle-b_820ms_ease-in-out_infinite]',
  'animate-[coop-card-shuffle-c_760ms_ease-in-out_infinite]',
  'animate-[coop-card-shuffle-d_880ms_ease-in-out_infinite]',
];

function CardFront({
  commandOrder,
  commandText,
  isFlipped = false,
}: {
  commandOrder: number | null;
  commandText: string;
  isFlipped?: boolean;
}) {
  return (
    <div className="h-32 w-80 flex-shrink-0 [perspective:900px]">
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-[#8B7355] bg-[#2A1F14] p-4 [backface-visibility:hidden]">
          {commandOrder !== null && (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#05AFF2] text-sm font-bold text-white">
              {commandOrder}
            </div>
          )}
          <code className="max-w-full overflow-hidden text-center font-mono text-[clamp(0.6rem,1.5vw,1rem)] leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            {commandText}
          </code>
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-[#8B7355] bg-[#3A2A1A] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="font-mono text-lg font-bold text-[#76BF41]">DONE</span>
        </div>
      </div>
    </div>
  );
}

export default function CoopCardArea() {
  const commands = useAtomValue(coopCommandsAtom);
  const myCommand = useAtomValue(coopMyCommandAtom);
  const isMyCommandCompleted = useAtomValue(coopMyCommandCompletedAtom);
  const phase = useAtomValue(coopPhaseAtom);

  if (phase === 'assign') {
    return (
      <section className="pointer-events-none z-30 flex w-full items-center justify-center">
        <style>{`
          @keyframes coop-card-shuffle-a {
            0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
            35% { transform: translateX(220px) translateY(-14px) rotate(4deg); }
            70% { transform: translateX(80px) translateY(12px) rotate(-3deg); }
          }
          @keyframes coop-card-shuffle-b {
            0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
            30% { transform: translateX(-190px) translateY(16px) rotate(-5deg); }
            65% { transform: translateX(130px) translateY(-10px) rotate(3deg); }
          }
          @keyframes coop-card-shuffle-c {
            0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
            40% { transform: translateX(170px) translateY(10px) rotate(-4deg); }
            75% { transform: translateX(-210px) translateY(-12px) rotate(5deg); }
          }
          @keyframes coop-card-shuffle-d {
            0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
            33% { transform: translateX(-230px) translateY(-16px) rotate(4deg); }
            68% { transform: translateX(-70px) translateY(14px) rotate(-3deg); }
          }
        `}</style>
        <div className="flex flex-row items-center justify-center gap-6">
          {COOP_CARD_BACKS.map((cardBack, index) => (
            <img
              key={cardBack}
              src={cardBack}
              alt=""
              className={`h-64 w-40 flex-shrink-0 object-contain [image-rendering:pixelated] ${SHUFFLE_CLASSES[index]}`}
              aria-hidden="true"
              draggable={false}
            />
          ))}
        </div>
      </section>
    );
  }

  const shouldShowMyCommand =
    myCommand !== null && (phase === 'input' || phase === 'wrong' || phase === 'reset_wait');

  if (shouldShowMyCommand) {
    return (
      <section className="pointer-events-none z-20 flex w-full items-center justify-center">
        <CardFront commandOrder={null} commandText={myCommand} isFlipped={isMyCommandCompleted} />
      </section>
    );
  }

  if (phase !== 'reveal' || commands.length === 0) return null;

  return (
    <section className="pointer-events-none z-20 flex w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
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
