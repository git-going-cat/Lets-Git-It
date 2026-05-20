export type Phase = 'idle' | 'scored';

export type CatMood = 'idle' | 'perfect' | 'partial' | 'forbidden';

export type ScoreStatus =
  | 'perfect'
  | 'accepted'
  | 'partial'
  | 'forbidden'
  | 'wrong'
  | 'lower-retry';

export interface ScoreResult {
  total: number;
  base: number;
  must: number;
  bonus: number;
  status: ScoreStatus;
  coaching: string;
}

export interface HistoryEntry {
  text: string;
  color: string;
  score: number;
  cardId: string;
  mockOutput?: string;
}

export interface FileItem {
  name: string;
  icon: string;
  status: 'clean' | 'modified' | 'added' | 'untracked';
  kind?: 'safe' | 'danger' | 'untracked';
}

export interface CommitItem {
  hash: string;
  msg: string;
  branch: string;
  remoteBranch?: string;
  current: boolean;
  isNew?: boolean;
}

export interface VizState {
  working: FileItem[];
  staging: FileItem[];
  commits: CommitItem[];
  stagingWarn?: boolean;
  flashIn?: 'working' | 'staging' | 'commits' | null;
}

export interface FlyingState {
  from: 'working' | 'staging' | 'commits';
  to: 'working' | 'staging' | 'commits';
  files: string[];
}

export interface FlyTransition {
  delayMs: number;
  flyFrom: 'working' | 'staging' | 'commits';
  flyTo: 'working' | 'staging' | 'commits';
  flyingFiles: string[];
  apply: (viz: VizState, ctx: { input: string }) => VizState;
}

export interface Card {
  id: string;
  scenarioId: number;
  stepIdx: number;
  title: string;
  narrative: string;
  canonical: string;
  canonicalLabel?: string;
  placeholder: string;
  hint: string;
  moodIdle: string;
  moodPerfect: string;
  explanation?: string;
  grade: (raw: string) => ScoreResult | null;
  initialViz: VizState;
  flyTransition?: FlyTransition;
  mockOutput?: string;
}

export interface IncidentStateRef {
  cardIndex: number;
  input: string;
  bestScore: number;
  phase: Phase;
}

export interface Scenario {
  id: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  synopsis: string;
  story: string;
  cards: Card[];
}
