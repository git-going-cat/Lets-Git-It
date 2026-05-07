import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

// VITE_FARO_URL 없으면(로컬·미설정) 비활성화
export const faro = import.meta.env.VITE_FARO_URL
  ? initializeFaro({
      url: import.meta.env.VITE_FARO_URL,
      app: {
        name: 'letsgitit-fe',
        version: '1.0.0',
        environment: import.meta.env.MODE,
      },
      instrumentations: [...getWebInstrumentations({ captureConsole: false })],
    })
  : null;
