import { Provider } from 'jotai';

import SingleHUD from '@/features/single/components/SingleHUD';

export default function SinglePage() {
  return (
    <Provider>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        <div className="w-1/5 border-r border-gray-700">
          <SingleHUD />
        </div>

        <div className="flex w-3/5 flex-col">
          <div id="phaser-container" className="flex-1 border-b border-gray-700" />
          <div className="h-48 border-t border-gray-700">{/* TODO(127): 입력창 컴포넌트 */}</div>
        </div>

        <div className="flex w-1/5 flex-col border-l border-gray-700">
          <div className="h-48 border-b border-gray-700">
            {/* TODO(127): 고양이 캐릭터 컴포넌트 */}
          </div>
          <div className="flex-1">{/* TODO(127): 츄르 스틱 컴포넌트 */}</div>
        </div>
      </div>
    </Provider>
  );
}
