import { createLazyFileRoute } from '@tanstack/react-router';

import IncidentRoute from './-IncidentRoute';

export const Route = createLazyFileRoute('/incident')({
  component: IncidentRoute,
});
