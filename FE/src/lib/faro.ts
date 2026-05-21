import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

import { env } from '@/config/env';

// FARO_URL 비어있으면(로컬·미설정) 비활성화
export const faro = env.FARO_URL
  ? initializeFaro({
      url: env.FARO_URL,
      app: {
        name: 'letsgitit-fe',
        version: '1.0.0',
        environment: env.MODE,
      },
      instrumentations: [...getWebInstrumentations({ captureConsole: false })],
    })
  : null;
