// TODO: import { HomePage } from '@/features/home/components/HomePage'
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/home')({
  component: () => <div />,
});
