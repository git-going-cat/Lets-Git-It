import { useNavigate, useSearch } from '@tanstack/react-router';

import LobbyPage from './LobbyPage';

import type { GameMode } from '../types/room.types';

/** /multi 라우트에서 LobbyPage를 URL 파라미터와 연결하는 래퍼 */
export function MultiLobbyRoute() {
  const { mode } = useSearch({ from: '/multi' });
  const navigate = useNavigate();
  // mode는 beforeLoad에서 redirect 가드가 undefined를 차단하므로 항상 정의됨
  return <LobbyPage mode={mode! as GameMode} onClose={() => void navigate({ to: '/home' })} />;
}
