import { useState } from 'react';
import { formatChips, centsFromDollars } from '../../utils/format';
import { MSG } from '../../types/websocket';

interface Props {
  gameId: string;
  playerName: string;
  send: (type: string, payload: unknown) => void;
}

const PRESETS = [20, 50, 100, 200];

export default function BustModal({ gameId, playerName, send }: Props) {
  const [amount, setAmount] = useState('50');
  const [ended, setEnded] = useState(false);

  const handleTopUp = () => {
    const cents = centsFromDollars(parseFloat(amount));
    if (isNaN(cents) || cents <= 0) return;
    send(MSG.TOP_UP, { gameId, amount: cents });
  };

  const handleEndGame = () => {
    setEnded(true);
    send(MSG.END_GAME, { gameId });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">💸</div>
          <h2 className="text-xl font-bold text-white">{playerName} is out of chips!</h2>
          <p className="text-sm text-gray-400 mt-1">Add more to keep playing or end the game.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Add Chips ($)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-mono text-lg focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-2 mt-2">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${
                  amount === String(v)
                    ? 'bg-green-700 text-white border border-green-500'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleTopUp}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-lg"
        >
          Add {formatChips(centsFromDollars(parseFloat(amount)) || 0)} and keep playing
        </button>

        <button
          onClick={handleEndGame}
          disabled={ended}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-sm border border-gray-700"
        >
          {ended ? 'Ending game...' : 'End Game'}
        </button>
      </div>
    </div>
  );
}
