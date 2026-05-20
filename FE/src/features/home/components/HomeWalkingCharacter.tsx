import { useHomeWalkingMotion } from '@/features/home/hooks/useHomeWalkingMotion';
import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

export default function HomeWalkingCharacter() {
  const { data: asset } = useCurrentCharacterAsset();
  const { areaRef, characterRef, handleCharacterClick, motion } = useHomeWalkingMotion({
    enabled: Boolean(asset),
  });

  if (!asset) return null;

  return (
    <div ref={areaRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <button
        ref={characterRef}
        type="button"
        className="pointer-events-auto absolute left-0 top-0 border-0 bg-transparent p-0 outline-none! focus:outline-none! focus-visible:outline-none!"
        onClick={handleCharacterClick}
        aria-label="캐릭터 애니메이션 재생"
        // 캐릭터 좌표와 이동 시간은 런타임에 계산되어 Tailwind 정적 클래스로 표현할 수 없습니다.
        style={{
          transform: `translate(${motion.x}px, ${motion.y}px)`,
          transition: motion.durationMs > 0 ? `transform ${motion.durationMs}ms linear` : 'none',
          visibility: motion.initialized ? 'visible' : 'hidden',
        }}
      >
        <AnimatedCharacter
          key={`${motion.animation}-${motion.direction}`}
          asset={asset}
          animation={motion.animation}
          direction={motion.direction}
          className="h-24 w-12 drop-shadow-lg"
        />
      </button>
    </div>
  );
}
