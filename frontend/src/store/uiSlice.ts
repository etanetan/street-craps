import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type DiceTheme = 'classic' | 'neon' | 'casino' | 'bone' | 'obsidian';
export type DiceAnimStyle = 'shake' | 'bounce' | 'spin' | 'tumble' | 'pulse';

interface UIState {
  selectedDiceTheme: DiceTheme;
  selectedDiceAnimStyle: DiceAnimStyle;
  showPayoutModal: boolean;
  payoutMessage: string;
  notification: string | null;
}

const savedTheme = localStorage.getItem('craps_dice_theme') as DiceTheme | null;
const validThemes: DiceTheme[] = ['classic', 'neon', 'casino', 'bone', 'obsidian'];

const savedAnim = localStorage.getItem('craps_dice_anim') as DiceAnimStyle | null;
const validAnims: DiceAnimStyle[] = ['shake', 'bounce', 'spin', 'tumble', 'pulse'];

const initialState: UIState = {
  selectedDiceTheme: savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'classic',
  selectedDiceAnimStyle: savedAnim && validAnims.includes(savedAnim) ? savedAnim : 'shake',
  showPayoutModal: false,
  payoutMessage: '',
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setDiceTheme(state, action: PayloadAction<DiceTheme>) {
      state.selectedDiceTheme = action.payload;
      localStorage.setItem('craps_dice_theme', action.payload);
    },
    setDiceAnimStyle(state, action: PayloadAction<DiceAnimStyle>) {
      state.selectedDiceAnimStyle = action.payload;
      localStorage.setItem('craps_dice_anim', action.payload);
    },
    showPayout(state, action: PayloadAction<string>) {
      state.showPayoutModal = true;
      state.payoutMessage = action.payload;
    },
    hidePayout(state) {
      state.showPayoutModal = false;
      state.payoutMessage = '';
    },
    setNotification(state, action: PayloadAction<string | null>) {
      state.notification = action.payload;
    },
  },
});

export const { setDiceTheme, setDiceAnimStyle, showPayout, hidePayout, setNotification } = uiSlice.actions;
export default uiSlice.reducer;
