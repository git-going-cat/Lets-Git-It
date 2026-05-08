export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  WS_URL: import.meta.env.VITE_WS_URL as string,
  BOARD_SURVEY_URL: import.meta.env.VITE_BOARD_SURVEY_URL as string,
} as const;
