import { useAtomValue } from 'jotai';

import { livesAtom, MAX_LIVES } from '../store/livesAtom';

export default function HUDLives() {
  const lives = useAtomValue(livesAtom);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-4">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <i key={i} className={`nes-icon heart ${i < lives ? '' : 'is-empty'} is-medium`} />
        ))}
      </div>
    </div>
  );
}
