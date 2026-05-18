import AnimatedCharacter from './AnimatedCharacter';

import type { CharacterAnimation, CharacterDirection } from './AnimatedCharacter';
import type { CharacterAsset } from '@/shared/types/user.types';
import type { ReactNode } from 'react';

interface PlayerCharacterPreviewProps {
  asset: CharacterAsset | null;
  animation?: CharacterAnimation;
  direction?: CharacterDirection;
  className?: string;
  characterClassName?: string;
  paused?: boolean;
  cropTopRatio?: number;
  fallback?: ReactNode;
}

export default function PlayerCharacterPreview({
  asset,
  animation = 'idle',
  direction = 'front',
  className,
  characterClassName,
  paused = true,
  cropTopRatio = 0.25,
  fallback = null,
}: PlayerCharacterPreviewProps) {
  return (
    <div className={className}>
      {asset ? (
        <AnimatedCharacter
          asset={asset}
          animation={animation}
          direction={direction}
          paused={paused}
          cropTopRatio={cropTopRatio}
          className={characterClassName}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
