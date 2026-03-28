import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Game, BetResult } from '../types/game';
import type {
  DiceRolledPayload,
  BetsResolvedPayload,
  PhaseChangedPayload,
  BetPlacedPayload,
  BetRemovedPayload,
  PlayerConnectionPayload,
  DeterminationRollPayload,
  ShooterDeterminedPayload,
} from '../types/websocket';

export type DiceAnimationState = 'idle' | 'shaking' | 'settling' | 'done';

interface GameState {
  game: Game | null;
  myPlayerId: string | null;
  myPlayerToken: string | null;
  pendingRoll: DiceRolledPayload | null; // current roll, waiting for animation
  pendingBetResults: BetResult[];        // queued until animation done
  diceAnimation: DiceAnimationState;
  lastError: string | null;
  wsConnected: boolean;
}

const initialState: GameState = {
  game: null,
  myPlayerId: null,
  myPlayerToken: null,
  pendingRoll: null,
  pendingBetResults: [],
  diceAnimation: 'idle',
  lastError: null,
  wsConnected: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGame(state, action: PayloadAction<Game>) {
      state.game = action.payload;
    },
    setMyPlayer(state, action: PayloadAction<{ playerId: string; playerToken: string }>) {
      state.myPlayerId = action.payload.playerId;
      state.myPlayerToken = action.payload.playerToken;
    },
    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
    },
    clearError(state) {
      state.lastError = null;
    },
    clearGame(state) {
      return { ...initialState, myPlayerId: state.myPlayerId, myPlayerToken: state.myPlayerToken };
    },

    // Dice roll received — start animation
    diceRolled(state, action: PayloadAction<DiceRolledPayload>) {
      state.pendingRoll = action.payload;
      state.diceAnimation = 'shaking';
    },
    diceAnimationComplete(state) {
      state.diceAnimation = 'done';
      // Apply pending bet results to game state
      if (state.game && state.pendingBetResults.length > 0) {
        // Results already applied server-side; game state will come via GAME_STATE broadcast
        state.pendingBetResults = [];
      }
    },

    betResultsQueued(state, action: PayloadAction<BetsResolvedPayload>) {
      state.pendingBetResults = action.payload.results;
    },

    phaseChanged(state, action: PayloadAction<PhaseChangedPayload>) {
      if (!state.game) return;
      state.game.phase = action.payload.phase;
      state.game.point = action.payload.point ?? 0;
      if (action.payload.shooterId) {
        state.game.shooterId = action.payload.shooterId;
      }
    },

    betPlaced(state, action: PayloadAction<BetPlacedPayload>) {
      if (!state.game) return;
      const { bet, playerId, playerChips } = action.payload;
      const player = state.game.players.find((p) => p.id === playerId);
      if (player) {
        player.bets = [...player.bets, bet];
        player.chips = playerChips;
      }
    },

    betRemoved(state, action: PayloadAction<BetRemovedPayload>) {
      if (!state.game) return;
      const { betId, playerId, playerChips } = action.payload;
      const player = state.game.players.find((p) => p.id === playerId);
      if (player) {
        player.bets = player.bets.filter((b) => b.id !== betId);
        player.chips = playerChips;
      }
    },

    playerConnectionChanged(state, action: PayloadAction<PlayerConnectionPayload>) {
      if (!state.game) return;
      const player = state.game.players.find((p) => p.id === action.payload.playerId);
      if (player) player.isConnected = action.payload.connected;
    },

    determinationRollReceived(state, action: PayloadAction<DeterminationRollPayload>) {
      if (!state.game) return;
      state.game.shooterDetermination = [
        ...(state.game.shooterDetermination || []),
        { playerId: action.payload.playerId, die: action.payload.die, round: action.payload.round },
      ];
    },

    shooterDetermined(state, action: PayloadAction<ShooterDeterminedPayload>) {
      if (!state.game) return;
      state.game.shooterId = action.payload.shooterId;
      state.game.players = state.game.players.map((p) => ({
        ...p,
        isShooter: p.id === action.payload.shooterId,
      }));
    },
  },
});

export const {
  setGame,
  setMyPlayer,
  setWsConnected,
  setError,
  clearError,
  clearGame,
  diceRolled,
  diceAnimationComplete,
  betResultsQueued,
  phaseChanged,
  betPlaced,
  betRemoved,
  playerConnectionChanged,
  determinationRollReceived,
  shooterDetermined,
} = gameSlice.actions;

export default gameSlice.reducer;
