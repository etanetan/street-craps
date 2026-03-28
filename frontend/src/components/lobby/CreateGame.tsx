import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { setMyPlayer, setGame } from '../../store/gameSlice';
import api from '../../services/api';
import { centsFromDollars } from '../../utils/format';

interface Props {
  mobile?: boolean;
}

const BUY_IN_PRESETS = [25, 50, 100, 200, 500];

export default function CreateGame({ mobile = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const animStyle = useSelector((s: RootState) => s.ui.selectedDiceAnimStyle);
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('100');
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

      const joinRes = await api.post(`/api/games/${gameId}/join`, {
        name: name.trim(),
        buyIn: buyInCents,
        diceTheme: theme,
        diceAnimStyle: animStyle,
      });

      const { playerId, playerToken } = joinRes.data;
      dispatch(setMyPlayer({ playerId, playerToken }));
      dispatch(setGame(joinRes.data.game));

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

  if (mobile) {
    return (
      <form onSubmit={handleCreate} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-green-500"
            required autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Buy-In</label>
          <div className="flex gap-2 mb-3">
            {BUY_IN_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBuyIn(String(v))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  buyIn === String(v)
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            min="1"
            step="1"
            placeholder="Custom amount"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-base focus:outline-none focus:border-green-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-5 rounded-xl transition-colors text-xl mt-2"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Create New Game</h2>
        <p className="text-sm text-gray-500">You'll get a shareable code for your friend</p>
      </div>
      <form onSubmit={handleCreate} className="space-y-5">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            required autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Buy-In</label>
          <div className="flex gap-1.5 mb-2">
            {BUY_IN_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBuyIn(String(v))}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  buyIn === String(v)
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            min="1"
            step="1"
            placeholder="Custom amount"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base mt-1"
        >
          {loading ? 'Creating...' : 'Create Game'}
        </button>
      </form>
    </div>
  );
}
