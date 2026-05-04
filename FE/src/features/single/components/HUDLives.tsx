import { useAtomValue } from 'jotai';

import { livesAtom, MAX_LIVES } from '../store/livesAtom';

export default function HUDLives() {
  const lives = useAtomValue(livesAtom);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full ${i < lives ? 'bg-red-500' : 'bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
}
