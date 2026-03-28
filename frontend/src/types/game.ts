export type GamePhase =
  | 'WAITING'
  | 'SHOOTER_DETERMINATION'
  | 'COME_OUT'
  | 'POINT_PHASE'
  | 'ROUND_OVER';

export type BetType =
  | 'PASS_LINE'
  | 'DONT_PASS'
  | 'PASS_ODDS'
  | 'DONT_ODDS'
  | 'PLACE'
  | 'HARDWAY'
  | 'ANY_CRAPS'
  | 'ANY_SEVEN'
  | 'HIGH_LOW';

export type BetOutcome = 'WIN' | 'LOSE' | 'PUSH';

export interface Bet {
  id: string;
  playerId: string;
  type: BetType;
  amount: number; // cents
  number: number;
  active: boolean;
}

export interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
  rolledBy: string;
  phase: GamePhase;
  timestamp: string;
}

export interface ShooterRoll {
  playerId: string;
  die: number;
  round: number;
}

export interface Player {
  id: string;
  userId: string;
  name: string;
  chips: number; // cents
  buyIn: number;
  isShooter: boolean;
  isConnected: boolean;
  seatOrder: number;
  diceTheme: string;
  bets: Bet[];
}

export interface Game {
  id: string;
  code: string;
  phase: GamePhase;
  point: number;
  shooterId: string;
  hostId: string;
  players: Player[];
  rollHistory: DiceRoll[];
  shooterDetermination: ShooterRoll[];
  determineRound: number;
  createdAt: string;
  updatedAt: string;
}

export interface BetResult {
  betId: string;
  playerId: string;
  outcome: BetOutcome;
  amount: number;
  netChips: number;
}
