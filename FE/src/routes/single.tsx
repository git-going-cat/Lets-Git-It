import { createFileRoute } from '@tanstack/react-router';

import SinglePage from '@/features/single/components/SinglePage';

// TODO: API 연동 후 beforeLoad 가드 추가
// import { redirect } from '@tanstack/react-router';
// import { useSingleStore } from '@/features/single/store/singleStore';
// beforeLoad: () => {
//   if (!useSingleStore.getState().sessionId) throw redirect({ to: '/home' });
// },
export const Route = createFileRoute('/single')({
  component: SinglePage,
});
