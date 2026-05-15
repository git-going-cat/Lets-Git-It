export type CoopGamePhase = 'reveal' | 'assign' | 'input' | 'wrong' | 'reset_wait';

export interface CoopPlayer {
  playerId: string;
  nickname: string;
  isMe: boolean;
  commandOrder: number;
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterBodyColor: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
}

export interface CoopCommandCard {
  commandOrder: number;
  commandText: string;
}

export interface CoopGameState {
  phase: CoopGamePhase;
  round: number;
  completedCount: number;
  elapsedSeconds: number;
  currentOrder: number;
  isInputBlocked: boolean;
  resetTargetPlayerId: string | null;
  players: CoopPlayer[];
  myCommand: string | null;
  graphImageUrl: string | null;
}
