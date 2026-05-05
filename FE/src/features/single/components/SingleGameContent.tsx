import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { EventBus } from '@/core/bridge/EventBus';
import { singleGameConfig } from '@/game/config';

import { useSingleGame } from '../hooks/useSingleGame';
import { SingleScene } from '../scenes/SingleScene';
import { useSingleStore } from '../store/singleStore';

import CommandInput from './CommandInput';
import GameProgress from './GameProgress';
import SingleHUD from './SingleHUD';

export default function SingleGameContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const { sessionId, difficulty, commandSet } = useSingleStore();

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
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: `url(${screenBg})` }}
      />
      <div className="relative flex w-[15%] flex-col border-r border-gray-700">
        <SingleHUD />
      </div>
      <div
        className="relative w-[70%]"
        style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) 160px', height: '100%' }}
      >
        <div className="border-b border-gray-700">
          <GameProgress />
        </div>
        <div ref={containerRef} className="overflow-hidden" />
        <div className="border-t border-gray-700">
          <CommandInput />
        </div>
      </div>
      <div className="relative flex w-[15%] flex-col border-l border-gray-700">
        <div className="flex h-48 flex-col border-b border-gray-700 p-2">
          {/* 상단: 우측 정렬된 일시정지 버튼 */}
          <div className="flex justify-end">
            <button
              type="button"
              className="nes-btn text-xs"
              onClick={() => EventBus.emit('game:pause')}
              aria-label="일시정지"
            >
              ⏸
            </button>
          </div>

          {/* 하단: 중앙 정렬된 캐릭터 */}
          <div className="flex flex-1 items-end justify-center pb-2">
            <span className="text-4xl">😸</span>
          </div>
        </div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
}
