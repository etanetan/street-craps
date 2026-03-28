import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../../store/store';
import { setMyPlayer, setGame } from '../../store/gameSlice';
import { setDiceTheme } from '../../store/uiSlice';
import type { DiceTheme } from '../../store/uiSlice';
import api from '../../services/api';
import { centsFromDollars } from '../../utils/format';

const THEMES: { id: DiceTheme; label: string; preview: string }[] = [
  { id: 'classic', label: 'Classic', preview: '⚀⚃' },
  { id: 'neon', label: 'Neon', preview: '🎲🎲' },
  { id: 'casino', label: 'Casino', preview: '🎰🎰' },
];

export default function CreateGame() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('100');
  const [theme, setTheme] = useState<DiceTheme>('classic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const buyInCents = centsFromDollars(parseFloat(buyIn));
    if (buyInCents <= 0) { setError('Buy-in must be positive'); return; }
    if (!name.trim()) { setError('Name is required'); return; }

    setLoading(true);
    try {
      const res = await api.post('/api/games', { diceTheme: theme });
      const { gameId, code } = res.data;

      // Join own game as host
      const joinRes = await api.post(`/api/games/${gameId}/join`, {
        name: name.trim(),
        buyIn: buyInCents,
        diceTheme: theme,
      });

      const { playerId, playerToken } = joinRes.data;
      dispatch(setMyPlayer({ playerId, playerToken }));
      dispatch(setGame(joinRes.data.game));
      dispatch(setDiceTheme(theme));

      // Persist session for reload recovery
      localStorage.setItem(`craps_session_${code}`, JSON.stringify({
        playerId,
        playerToken,
        gameId,
      }));

      navigate(`/game/${code}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
      <h2 className="text-lg font-bold text-white mb-4">Create New Game</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
            required autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Buy-In ($)</label>
          <input
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Dice Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  theme === t.id
                    ? 'border-green-500 bg-green-900/30 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="text-xl">{t.preview}</div>
                <div className="text-xs mt-1">{t.label}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}
