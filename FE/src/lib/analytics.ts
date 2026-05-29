import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

import { env } from '@/config/env';
import { faro } from '@/lib/faro';

import type { GameEndReason } from '@/features/single/store/gameResultAtom';

// dev 이벤트가 prod PostHog 프로젝트로 유입되는 것을 방지 — production 빌드에서만 활성화
const isEnabled = Boolean(env.POSTHOG_KEY) && env.MODE === 'production';

const capture = (event: string, props?: Record<string, unknown>) => {
  if (!isEnabled) return;
  posthog.capture(event, props);
};

type GameOverReason = Exclude<GameEndReason, 'SUCCESS'>;
type MultiMode = 'CONTRIBUTION' | 'COOP';
type RoomEntryMethod = 'list' | 'code' | 'create';
type WsDisconnectKind = 'tcp_close' | 'stomp_error' | 'force_disconnect';
type AnalyticsFeature = 'single' | 'multi' | 'contribution' | 'coop' | 'incident';

export const analytics = {
  identifyUser: (memberId: string) => {
    if (!isEnabled || !memberId) return;
    posthog.identify(memberId);
  },
  resetUser: () => {
    if (!isEnabled) return;
    posthog.reset();
  },

  gameModeSelected: (mode: 'single' | 'multi') => capture('game_mode_selected', { mode }),

  gameStarted: (mode: 'single' | 'tutorial', difficulty?: string) =>
    capture('game_started', { mode, difficulty }),

  gameCompleted: (difficulty: string, score: number, playTimeMs: number) =>
    capture('game_completed', { difficulty, score, play_time_ms: playTimeMs }),

  gameOver: (difficulty: string, playTimeMs: number, reason: GameOverReason) =>
    capture('game_over', { difficulty, play_time_ms: playTimeMs, reason }),

  gameAbandoned: () => capture('game_abandoned'),

  singleGameRestarted: (props: { from: 'pause' | 'result'; difficulty: string }) =>
    capture('single_game_restarted', props),

  tutorialStepCompleted: (step: number, total: number) =>
    capture('tutorial_step_completed', { step, total }),

  tutorialSkipped: (at_step: number) => capture('tutorial_skipped', { at_step }),

  // ── Single 다시하기 ────────────────────────────────────────────────────
  singleGameRestarted: (props: { from: 'pause' | 'result'; difficulty: string }) =>
    capture('single_game_restarted', props),

  // ── Multi 방 ──────────────────────────────────────────────────────────
  multiRoomCreated: (
    mode: MultiMode,
    props: { roomId: number; hasPassword: boolean; maxPlayers?: number; selectedMapId?: number }
  ) => capture('multi_room_created', { mode, ...props }),

  multiRoomJoined: (
    mode: MultiMode,
    props: { roomId: number; via: RoomEntryMethod; hasPassword: boolean }
  ) => capture('multi_room_joined', { mode, ...props }),

  multiWaitingRoomEntered: (mode: MultiMode | null, roomId: number) =>
    capture('multi_waiting_room_entered', { mode, room_id: roomId }),

  multiGameStartClicked: (mode: MultiMode, props: { roomId: number; memberCount: number }) =>
    capture('multi_game_start_clicked', { mode, ...props }),

  multiRoomLeft: (
    mode: MultiMode | null,
    props: { roomId: number; trigger: 'manual' | 'kicked' | 'force_disconnect' }
  ) => capture('multi_room_left', { mode, ...props }),

  // ── Contribution 게임 ─────────────────────────────────────────────────
  contributionGameStarted: (props: { roomId: number; sessionId: string; playerCount: number }) =>
    capture('contribution_game_started', props),

  contributionGameEnded: (props: {
    roomId: number;
    sessionId: string;
    isSuccess: boolean;
    myRank: number | null;
    rankingsCount: number;
    reason: string | null;
  }) => capture('contribution_game_ended', props),

  contributionGameExited: (props: {
    roomId: number | null;
    via: 'home' | 'back_to_room' | 'kicked' | 'force_disconnect';
  }) => capture('contribution_game_exited', props),

  // ── Incident ──────────────────────────────────────────────────────────
  incidentScenarioStarted: (props: {
    scenarioId: number;
    scenarioTitle: string;
    cardCount: number;
  }) => capture('incident_scenario_started', props),

  incidentScenarioCompleted: (props: {
    scenarioId: number;
    scenarioTitle: string;
    cardCount: number;
    totalScore: number;
    maxScore: number;
    durationMs: number;
  }) => capture('incident_scenario_completed', props),

  incidentScenarioAbandoned: (props: {
    scenarioId: number;
    scenarioTitle: string;
    currentCardIndex: number;
    cardCount: number;
    durationMs: number;
  }) => capture('incident_scenario_abandoned', props),

  // ── WS 끊김 헬퍼 (PostHog 미사용 — Faro + Sentry 직접 전송) ──────────
  reportWsDisconnect: (props: {
    kind: WsDisconnectKind;
    code?: string;
    message?: string;
    route?: string;
    feature?: AnalyticsFeature | null;
    sessionId?: string | null;
    roomId?: number | null;
  }) => {
    const context: Record<string, string> = {
      kind: props.kind,
      route: props.route ?? window.location.pathname,
    };
    if (props.code) context.code = props.code;
    if (props.feature) context.feature = props.feature;
    if (props.sessionId) context.session_id = props.sessionId;
    if (props.roomId != null) context.room_id = String(props.roomId);

    faro?.api.pushError(
      new Error(`WS disconnect: ${props.kind}${props.code ? ` (${props.code})` : ''}`),
      { context }
    );

    // STOMP error만 Sentry warning — TCP close/force_disconnect는 Faro로만
    if (props.kind === 'stomp_error') {
      Sentry.captureMessage(`WS STOMP error: ${props.code ?? 'unknown'}`, {
        level: 'warning',
        tags: { ws_kind: props.kind, ws_code: props.code ?? 'unknown' },
        extra: context,
      });
    }
  },
};
