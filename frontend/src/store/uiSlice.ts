import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type DiceTheme = 'classic' | 'neon' | 'casino' | 'bone' | 'obsidian';

interface UIState {
  selectedDiceTheme: DiceTheme;
  showPayoutModal: boolean;
  payoutMessage: string;
  notification: string | null;
}

const savedTheme = localStorage.getItem('craps_dice_theme') as DiceTheme | null;
const validThemes: DiceTheme[] = ['classic', 'neon', 'casino', 'bone', 'obsidian'];

const initialState: UIState = {
  selectedDiceTheme: savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'classic',
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

export const { setDiceTheme, showPayout, hidePayout, setNotification } = uiSlice.actions;
export default uiSlice.reducer;
