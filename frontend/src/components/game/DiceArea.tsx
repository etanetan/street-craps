import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { diceAnimationComplete } from '../../store/gameSlice';

// Dot positions as [left%, top%] within the die face
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[72, 28], [28, 72]],
  3: [[72, 28], [50, 50], [28, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 20], [28, 50], [28, 80], [72, 20], [72, 50], [72, 80]],
};

interface DieFaceProps {
  value: number;
  theme?: string;
  animState?: string;
  size?: number;
}

export function DieFaceCSS({ value, theme = 'classic', animState = 'done', size = 112 }: DieFaceProps) {
  const dots = value >= 1 && value <= 6 ? DOT_POSITIONS[value] : [];
  const isAnimating = animState === 'shaking';
  const isSettling = animState === 'settling';
  const dotSize = Math.max(3, Math.round(size * 0.16));
  const radius = Math.round(size * 0.18);

  const containerStyle: React.CSSProperties =
    theme === 'neon'
      ? { background: '#0f0520', border: '2px solid #a855f7', boxShadow: '0 0 18px rgba(168,85,247,0.6)', borderRadius: radius }
      : theme === 'casino'
      ? { background: '#1a0000', border: '2px solid #dc2626', boxShadow: '0 0 18px rgba(220,38,38,0.5)', borderRadius: radius }
      : theme === 'bone'
      ? { background: '#f5f0e8', border: '1.5px solid #c8b89a', boxShadow: '0 4px 14px rgba(0,0,0,0.3)', borderRadius: radius * 1.4 }
      : theme === 'obsidian'
      ? { background: '#111418', border: '2px solid #b8860b', boxShadow: '0 0 16px rgba(184,134,11,0.4)', borderRadius: radius }
      : { background: '#ffffff', border: '1.5px solid #d1d5db', boxShadow: '0 4px 14px rgba(0,0,0,0.35)', borderRadius: radius };

  const dotColor =
    theme === 'neon' ? '#d8b4fe' :
    theme === 'casino' ? '#f8fafc' :
    theme === 'bone' ? '#3d2b1f' :
    theme === 'obsidian' ? '#d4a017' :
    '#111827';

  return (
    <div
      className={`relative flex-shrink-0 select-none ${isAnimating ? 'dice-shaking' : ''} ${isSettling ? 'dice-settling' : ''}`}
      style={{ width: size, height: size, ...containerStyle }}
    >
      {dots.map(([left, top], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: dotColor,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      {value === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: size * 0.35, fontWeight: 'bold' }}>
          ?
        </div>
      )}
    </div>
  );
}

export default function DiceArea() {
  const dispatch = useDispatch<AppDispatch>();
  const pendingRoll = useSelector((s: RootState) => s.game.pendingRoll);
  const animState = useSelector((s: RootState) => s.game.diceAnimation);
  const localTheme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const rollLabel = useSelector((s: RootState) => s.game.pendingRollLabel);
  const game = useSelector((s: RootState) => s.game.game);
  const [displayDie1, setDisplayDie1] = useState(0);
  const [displayDie2, setDisplayDie2] = useState(0);

  // Use the shooter's dice theme if available, otherwise fall back to local preference
  const shooter = game?.players.find(p => p.isShooter);
  const diceTheme = shooter?.diceTheme || localTheme;

  useEffect(() => {
    if (animState === 'shaking' && pendingRoll) {
      const t = setTimeout(() => {
        setDisplayDie1(pendingRoll.die1);
        setDisplayDie2(pendingRoll.die2);
        dispatch(diceAnimationComplete());
      }, 900);
      return () => clearTimeout(t);
    }
  }, [animState, pendingRoll, dispatch]);

  const total = displayDie1 + displayDie2;

  return (
    <div className="flex flex-col items-center gap-4 py-6 w-full">
      <div className="flex gap-6 items-center justify-center">
        <DieFaceCSS value={displayDie1} theme={diceTheme} animState={animState} size={112} />
        <DieFaceCSS value={displayDie2} theme={diceTheme} animState={animState} size={112} />
      </div>

      {total > 0 && animState !== 'shaking' && (
        <div className="fade-in-up text-center">
          <div className="text-3xl font-bold text-white">{total}</div>
          {rollLabel && <div className="text-sm text-gray-300 mt-0.5">{rollLabel}</div>}
        </div>
      )}
    </div>
  );
}
