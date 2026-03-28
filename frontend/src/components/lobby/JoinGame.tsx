import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store/store';
import { setMyPlayer, setGame } from '../../store/gameSlice';
import api from '../../services/api';
import { centsFromDollars } from '../../utils/format';

interface Props {
  initialCode?: string;
}

export default function JoinGame({ initialCode = '' }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const buyInCents = centsFromDollars(parseFloat(buyIn));
    if (buyInCents <= 0) { setError('Buy-in must be positive'); return; }
    if (!name.trim()) { setError('Name is required'); return; }
    if (code.trim().length !== 6) { setError('Game code must be 6 characters'); return; }

    setLoading(true);
    try {
      // First get the game by code to find the gameId
      const gameRes = await api.get(`/api/games/${code.trim()}`);
      const game = gameRes.data;

      const joinRes = await api.post(`/api/games/${game.id}/join`, {
        name: name.trim(),
        buyIn: buyInCents,
        diceTheme: theme,
      });

      const { playerId, playerToken } = joinRes.data;
      dispatch(setMyPlayer({ playerId, playerToken }));
      dispatch(setGame(joinRes.data.game));

      localStorage.setItem(`craps_session_${code.trim()}`, JSON.stringify({
        playerId,
        playerToken,
        gameId: game.id,
      }));

      navigate(`/game/${code.trim()}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
      <h2 className="text-lg font-bold text-white mb-4">Join Game</h2>
      <form onSubmit={handleJoin} className="space-y-4">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Game Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-lg text-center tracking-widest focus:outline-none focus:border-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
            required
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
}
