import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { diceAnimationComplete } from '../../store/gameSlice';

// Classic die faces using Unicode
const CLASSIC_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
// Neon and casino use emoji with different color treatment
const NEON_FACES = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
const CASINO_FACES = ['', '🎲', '🎲', '🎲', '🎲', '🎲', '🎲'];

function DieFace({ value, theme, animState }: { value: number; theme: string; animState: string }) {
  const faces = theme === 'neon' ? NEON_FACES : theme === 'casino' ? CASINO_FACES : CLASSIC_FACES;
  const isAnimating = animState === 'shaking';
  const isSettling = animState === 'settling';

  const baseClass = 'text-8xl flex items-center justify-center w-28 h-28 rounded-2xl select-none';

  const themeClass =
    theme === 'neon'
      ? 'bg-purple-900/50 border-2 border-purple-400 shadow-[0_0_20px_rgba(167,139,250,0.5)]'
      : theme === 'casino'
      ? 'bg-red-900/40 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
      : 'bg-white text-gray-900 shadow-xl border border-gray-200';

  return (
    <div
      className={`${baseClass} ${themeClass} ${isAnimating ? 'dice-shaking' : ''} ${isSettling ? 'dice-settling' : ''}`}
    >
      {value > 0 ? faces[value] : (theme === 'classic' ? '⬜' : '❓')}
    </div>
  );
}

export default function DiceArea() {
  const dispatch = useDispatch<AppDispatch>();
  const pendingRoll = useSelector((s: RootState) => s.game.pendingRoll);
  const animState = useSelector((s: RootState) => s.game.diceAnimation);
  const diceTheme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const [displayDie1, setDisplayDie1] = useState(0);
  const [displayDie2, setDisplayDie2] = useState(0);

  useEffect(() => {
    if (animState === 'shaking' && pendingRoll) {
      // Show random faces during shake, then reveal after ~800ms
      setTimeout(() => {
        setDisplayDie1(pendingRoll.die1);
        setDisplayDie2(pendingRoll.die2);
        dispatch(diceAnimationComplete());
      }, 900);
    }
  }, [animState, pendingRoll]);

  const total = displayDie1 + displayDie2;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex gap-6 items-center">
        <DieFace value={displayDie1} theme={diceTheme} animState={animState} />
        <DieFace value={displayDie2} theme={diceTheme} animState={animState} />
      </div>

      {total > 0 && animState !== 'shaking' && (
        <div className="fade-in-up text-center">
          <div className="text-3xl font-bold text-white">{total}</div>
          <div className="text-sm text-gray-400 mt-0.5">{getRollLabel(total)}</div>
        </div>
      )}
    </div>
  );
}

function getRollLabel(total: number): string {
  if (total === 7 || total === 11) return 'Natural! 🎉';
  if (total === 2 || total === 3 || total === 12) return 'Craps!';
  return '';
}
