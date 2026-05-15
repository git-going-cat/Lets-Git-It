import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { coopBus } from '../../bridge/coopBus';
import { coopCommandsAtom } from '../../store/coopCommandsAtom';
import { coopPhaseAtom } from '../../store/coopPhaseAtom';

export default function RevealOverlay() {
  const commands = useAtomValue(coopCommandsAtom);
  const setPhase = useSetAtom(coopPhaseAtom);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      setPhase('assign');
      coopBus.emit('coop:reveal-ended');
      return;
    }

    const timerId = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [countdown, setPhase]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(5,8,18,0.75)] font-pixel text-white backdrop-blur">
      <div className="flex w-96 flex-col items-center gap-5">
        <h2 className="text-2xl text-[#F2CB05]">순서를 암기하세요!</h2>
        <div className="text-6xl text-[#F2CB05]">{Math.max(1, countdown)}</div>
        <div className="flex w-full flex-col gap-3">
          {commands.map((command) => (
            <div
              key={command.commandOrder}
              className="flex items-center gap-3 border-2 border-dotted border-[#05AFF2] bg-[#0d1117]/90 p-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#05AFF2] text-sm text-[#05AFF2]">
                {command.commandOrder}
              </span>
              <span className="text-sm leading-6">{command.commandText}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
