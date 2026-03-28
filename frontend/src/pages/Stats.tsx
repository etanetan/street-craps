import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store/store';
import { setDiceTheme, setDiceAnimStyle } from '../store/uiSlice';
import type { DiceTheme, DiceAnimStyle } from '../store/uiSlice';
import { DieFaceCSS } from '../components/game/DiceArea';
import ChipChart from '../components/shared/ChipChart';
import api from '../services/api';
import { formatChips } from '../utils/format';

interface Stats {
  gamesPlayed: number;
  diceRolled: number;
  netChips: number;
  biggestWin: number;
  biggestLoss: number;
  chipHistory?: { t: number; v: number }[];
}

const THEMES: { id: DiceTheme; label: string; description: string }[] = [
  { id: 'classic', label: 'Classic', description: 'Clean white' },
  { id: 'neon', label: 'Neon', description: 'Purple glow' },
  { id: 'casino', label: 'Casino', description: 'Red felt' },
  { id: 'bone', label: 'Bone', description: 'Ivory warm' },
  { id: 'obsidian', label: 'Obsidian', description: 'Gold on black' },
];

const ANIMS: { id: DiceAnimStyle; label: string; description: string }[] = [
  { id: 'shake', label: 'Shake', description: 'Classic rattle' },
  { id: 'bounce', label: 'Bounce', description: 'Vertical bounce' },
  { id: 'spin', label: 'Spin', description: 'Full rotation' },
  { id: 'tumble', label: 'Tumble', description: 'Forward flip' },
  { id: 'pulse', label: 'Pulse', description: 'Heartbeat' },
];

// Maps anim style to preview CSS class
const ANIM_PREVIEW_CLASS: Record<DiceAnimStyle, string> = {
  shake:  'dice-anim-shake',
  bounce: 'dice-anim-bounce',
  spin:   'dice-anim-spin',
  tumble: 'dice-anim-tumble',
  pulse:  'dice-anim-pulse',
};

export default function StatsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { userId, isAuthenticated } = {
    userId: useSelector((s: RootState) => s.auth.userId),
    isAuthenticated: !!useSelector((s: RootState) => s.auth.accessToken),
  };
  const selectedTheme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const selectedAnim = useSelector((s: RootState) => s.ui.selectedDiceAnimStyle);
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAnim, setPreviewAnim] = useState<DiceAnimStyle | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!userId) return;
    api.get(`/api/users/${userId}/stats`)
      .then((res) => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleAnimSelect = (anim: DiceAnimStyle) => {
    dispatch(setDiceAnimStyle(anim));
    // Trigger a brief preview animation
    setPreviewAnim(null);
    setTimeout(() => setPreviewAnim(anim), 10);
    setTimeout(() => setPreviewAnim(null), 900);
  };

  const netColor = !stats ? 'text-white' : stats.netChips >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-6">Your Account</h1>

        {/* Dice Style Picker */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Dice Style</h2>
          <p className="text-xs text-gray-500 mb-4">Your dice look this way when you roll — on both screens.</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => dispatch(setDiceTheme(t.id))}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                  selectedTheme === t.id
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <DieFaceCSS value={5} theme={t.id} size={52} />
                <div className="text-center">
                  <div className={`text-xs font-semibold ${selectedTheme === t.id ? 'text-green-400' : 'text-gray-300'}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dice Animation Picker */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Dice Animation</h2>
          <p className="text-xs text-gray-500 mb-4">How your dice move when you roll. Click to preview.</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {ANIMS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAnimSelect(a.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                  selectedAnim === a.id
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <DieFaceCSS
                  value={5}
                  theme={selectedTheme}
                  animClass={previewAnim === a.id ? ANIM_PREVIEW_CLASS[a.id] : ''}
                  size={52}
                />
                <div className="text-center">
                  <div className={`text-xs font-semibold ${selectedAnim === a.id ? 'text-green-400' : 'text-gray-300'}`}>
                    {a.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{a.description}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-green-500 mt-3 text-center">
            ✓ {THEMES.find(t => t.id === selectedTheme)?.label} / {ANIMS.find(a => a.id === selectedAnim)?.label} — saved automatically
          </p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Stats</h2>
        {loading ? (
          <div className="text-gray-400 text-sm">Loading stats...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard label="Games Played" value={String(stats.gamesPlayed)} />
              <StatCard label="Dice Rolled" value={String(stats.diceRolled)} />
              <StatCard label="Net Profit/Loss" value={formatChips(Math.abs(stats.netChips))} valueClass={netColor} />
              <StatCard label="Biggest Win" value={formatChips(stats.biggestWin)} valueClass="text-green-400" />
              <StatCard label="Biggest Loss" value={formatChips(Math.abs(stats.biggestLoss))} valueClass="text-red-400" />
            </div>
            {/* Chip history chart */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Cumulative Profit / Loss by Game</h3>
              <ChipChart data={stats.chipHistory ?? []} />
            </div>
          </>
        ) : (
          <p className="text-gray-400">No stats yet — play a game!</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-center">
      <div className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
