import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/home')({
  validateSearch: z.object({
    // 다른 페이지(/single 등)에서 에러 후 home으로 복귀하면서 특정 모달을 즉시 열기 위한 파라미터.
    // HomePage가 한 번 읽어 activeModal에 반영한 뒤 즉시 URL에서 제거한다.
    modal: z.enum(['explorer-single', 'explorer-multi']).optional(),
    // 대기실에서 나갔을 때 로비 모달을 자동으로 열기 위한 파라미터.
    lobby: z.enum(['CONTRIBUTION', 'COOP']).optional(),
  }),
});
