import type { Game, GamePhase, Bet, BetResult, BetType } from './game';

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
}

// Client → Server
export interface PlaceBetPayload {
  gameId: string;
  betType: BetType;
  amount: number; // cents
  number?: number;
}

export interface RemoveBetPayload {
  gameId: string;
  betId: string;
}

export interface RollDicePayload {
  gameId: string;
}

export interface StartGamePayload {
  gameId: string;
}

export interface RollDeterminationPayload {
  gameId: string;
}

// Server → Client
export interface PlayerConnectionPayload {
  playerId: string;
  connected: boolean;
}

export interface DeterminationRollPayload {
  playerId: string;
  die: number;
  round: number;
}

export interface ShooterDeterminedPayload {
  shooterId: string;
  playerName: string;
}

export interface DiceRolledPayload {
  die1: number;
  die2: number;
  total: number;
  shooterId: string;
}

export interface BetsResolvedPayload {
  results: BetResult[];
}

export interface PhaseChangedPayload {
  phase: GamePhase;
  point?: number;
  shooterId?: string;
}

export interface BetPlacedPayload {
  bet: Bet;
  playerId: string;
  playerChips: number;
}

export interface BetRemovedPayload {
  betId: string;
  playerId: string;
  playerChips: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// Message type constants (mirror backend)
export const MSG = {
  // Client → Server
  JOIN_ROOM: 'JOIN_ROOM',
  ROLL_DETERMINATION: 'ROLL_DETERMINATION',
  PLACE_BET: 'PLACE_BET',
  REMOVE_BET: 'REMOVE_BET',
  ROLL_DICE: 'ROLL_DICE',
  START_GAME: 'START_GAME',
  TOP_UP: 'TOP_UP',
  END_GAME: 'END_GAME',
  CANCEL_END_GAME: 'CANCEL_END_GAME',
  APPROVE_BET: 'APPROVE_BET',
  REJECT_BET: 'REJECT_BET',
  PING: 'PING',
  // Server → Client
  GAME_STATE: 'GAME_STATE',
  GAME_ENDED: 'GAME_ENDED',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_CONNECTION: 'PLAYER_CONNECTION',
  DETERMINATION_ROLL: 'DETERMINATION_ROLL',
  SHOOTER_DETERMINED: 'SHOOTER_DETERMINED',
  DICE_ROLLED: 'DICE_ROLLED',
  BETS_RESOLVED: 'BETS_RESOLVED',
  PHASE_CHANGED: 'PHASE_CHANGED',
  BET_PLACED: 'BET_PLACED',
  BET_REMOVED: 'BET_REMOVED',
  ERROR: 'ERROR',
  PONG: 'PONG',
} as const;

export type GameStatePayload = Game;
