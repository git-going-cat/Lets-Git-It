import { useEffect, useMemo, useRef } from 'react';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { EventBus } from '@/core/bridge/EventBus';
import { singleGameConfig } from '@/game/config';

import { useSingleGame } from '../hooks/useSingleGame';
import { SingleScene } from '../scenes/SingleScene';
import { useSingleStore } from '../store/singleStore';

import CatSprite from './CatSprite';
import ChuruStack from './ChuruStack';
import CommandInput from './CommandInput';
import GameProgress from './GameProgress';
import SingleHUD from './SingleHUD';

export default function SingleGameContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const { sessionId, difficulty, commandSet } = useSingleStore();
  const totalCommands = useMemo(
    () => commandSet.filter((c) => c.type !== 'SWITCH').length,
    [commandSet]
  );

  useSingleGame();

  useEffect(() => {
    if (!containerRef.current || !sessionId || !difficulty) return;

    const game = new Phaser.Game({
      ...singleGameConfig,
      parent: containerRef.current,
      scene: [],
    });

    gameRef.current = game;

    game.events.once('ready', () => {
      game.scene.add('SingleScene', SingleScene, true, {
        sessionId,
        difficulty,
        commandSet,
      });
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [sessionId, difficulty, commandSet]);

  return (
    <div className="relative flex h-screen overflow-hidden text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />
      <div className="relative flex w-[15%] flex-col">
        <SingleHUD />
      </div>
      <div className="relative grid h-full w-[70%] grid-rows-single-game">
        <GameProgress />
        <div ref={containerRef} className="overflow-hidden" />
        <CommandInput />
      </div>
      <div className="relative flex w-[15%] flex-col">
        <div className="flex h-48 flex-col">
          {/* 상단: 우측 정렬된 일시정지 버튼 */}
          <div className="flex justify-end p-2">
            <button
              type="button"
              className="nes-btn text-xl"
              onClick={() => EventBus.emit('game:pause')}
              aria-label="일시정지"
            >
              ⏸
            </button>
          </div>

          {/* 하단: 중앙 정렬된 캐릭터 */}
          <div className="flex flex-1 items-end justify-center border-b border-gray-600">
            <CatSprite />
          </div>
        </div>
        <ChuruStack totalCommands={totalCommands} />
      </div>
    </div>
  );
}
