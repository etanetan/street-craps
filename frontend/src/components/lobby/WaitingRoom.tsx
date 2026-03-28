import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { MSG } from '../../types/websocket';
import { formatChips } from '../../utils/format';

interface Props {
  send: (type: string, payload: unknown) => void;
}

export default function WaitingRoom({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const [copied, setCopied] = useState(false);

  if (!game) return null;

  const isHost = game.hostId === myPlayerId;
  const shareUrl = `${window.location.origin}/game/${game.code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    send(MSG.START_GAME, { gameId: game.id });
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 fade-in-up">
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-green-400 tracking-widest mb-1">{game.code}</div>
        <div className="text-sm text-gray-400">Game Code</div>
      </div>

      <div className="flex gap-2 items-center">
        <input
          readOnly
          value={shareUrl}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 w-64 focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Players ({game.players.length})</h3>
        <div className="space-y-2">
          {game.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="font-medium">
                  {p.name}
                  {p.id === myPlayerId && <span className="text-gray-500 text-sm ml-1">(you)</span>}
                  {p.id === game.hostId && <span className="text-yellow-500 text-xs ml-1">HOST</span>}
                </span>
              </div>
              <span className="text-green-400 font-mono text-sm">{formatChips(p.buyIn)}</span>
            </div>
          ))}
        </div>

        {game.players.length < 2 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Waiting for at least 1 more player...
          </p>
        )}
      </div>

      {isHost ? (
        <button
          onClick={handleStart}
          disabled={game.players.length < 2}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors pulse-glow"
        >
          Start Game
        </button>
      ) : (
        <p className="text-gray-400 text-sm">Waiting for host to start...</p>
      )}
    </div>
  );
}
