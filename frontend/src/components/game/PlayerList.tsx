import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { formatChips } from '../../utils/format';

export default function PlayerList() {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  if (!game) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Players</h3>
      <div className="space-y-2">
        {game.players.map((p) => {
          const totalBets = p.bets?.reduce((sum, b) => sum + b.amount, 0) || 0;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                p.id === myPlayerId ? 'bg-green-900/20 border border-green-800' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                <div>
                  <div className="text-sm font-medium leading-tight">
                    {p.name}
                    {p.isShooter && <span className="ml-1 text-yellow-400 text-xs">🎲 SHOOTER</span>}
                    {p.id === myPlayerId && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                  </div>
                  {totalBets > 0 && (
                    <div className="text-xs text-gray-500">Bet: {formatChips(totalBets)}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-bold text-sm ${p.chips < p.buyIn * 0.25 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatChips(p.chips)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
