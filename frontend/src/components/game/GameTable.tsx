import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { clearError, clearRollOutcome } from '../../store/gameSlice';
import { formatChips } from '../../utils/format';
import DiceArea from './DiceArea';
import BettingPanel from './BettingPanel';
import GameLog from './GameLog';
import PlayerList from './PlayerList';
import PointMarker from './PointMarker';
import ShooterSelector from './ShooterSelector';
import BustModal from './BustModal';
import WaitingRoom from '../lobby/WaitingRoom';

interface Props {
  send: (type: string, payload: unknown) => void;
}

export default function GameTable({ send }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const wsConnected = useSelector((s: RootState) => s.game.wsConnected);
  // Show bust modal when any player in an active game hits 0 chips
  const bustedPlayer = (game?.phase === 'COME_OUT' || game?.phase === 'POINT_PHASE')
    ? game.players.find(p => p.chips === 0)
    : undefined;
  const error = useSelector((s: RootState) => s.game.lastError);
  const rollOutcome = useSelector((s: RootState) => s.game.rollOutcome);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearError()), 3000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  useEffect(() => {
    if (!rollOutcome) return;
    const t = setTimeout(() => dispatch(clearRollOutcome()), 3000);
    return () => clearTimeout(t);
  }, [rollOutcome, dispatch]);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading game...</div>
      </div>
    );
  }

  const inGame = game.phase === 'COME_OUT' || game.phase === 'POINT_PHASE';

  return (
    <div className="min-h-screen bg-gray-950">
      {!wsConnected && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 text-yellow-300 text-sm text-center py-2">
          Reconnecting...
        </div>
      )}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 text-red-300 text-sm text-center py-2">
          {error}
        </div>
      )}

      {/* Win/lose toast */}
      {rollOutcome && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-lg shadow-2xl fade-in-up pointer-events-none whitespace-nowrap ${
          rollOutcome.net > 0 ? 'bg-green-700 text-white' :
          rollOutcome.net < 0 ? 'bg-red-800 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {rollOutcome.label && <span>{rollOutcome.label} </span>}
          {rollOutcome.net > 0 ? `+${formatChips(rollOutcome.net)}` :
           rollOutcome.net < 0 ? formatChips(rollOutcome.net) : 'Push'}
        </div>
      )}

      {/* Roll history modal */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Roll History</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>
            <GameLog />
          </div>
        </div>
      )}

      {bustedPlayer && game && (
        <BustModal
          gameId={game.id}
          playerName={bustedPlayer.name}
          send={send}
        />
      )}

      {game.phase === 'WAITING' && <WaitingRoom send={send} />}
      {game.phase === 'SHOOTER_DETERMINATION' && <ShooterSelector send={send} />}

      {inGame && (
        <>
          {/* ── DESKTOP layout (lg+) ── */}
          <div className="hidden lg:block">
            <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <PlayerList />
                <GameLog />
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  game.phase === 'COME_OUT' ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                }`}>
                  {game.phase === 'COME_OUT' ? 'Come-Out Roll' : 'Point Phase'}
                </div>
                <PointMarker point={game.point} />
                <DiceArea />
              </div>
              <div><BettingPanel send={send} /></div>
            </div>
          </div>

          {/* ── MOBILE layout (< lg) ── */}
          <div className="lg:hidden flex flex-col min-h-screen">
            {/* Top bar: phase + players */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
                game.phase === 'COME_OUT' ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
              }`}>
                {game.phase === 'COME_OUT' ? 'Come-Out' : `Point: ${game.point}`}
              </div>
              <div className="flex gap-2 overflow-hidden">
                {game.players.map(p => (
                  <div key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs shrink-0 ${
                    p.id === myPlayerId ? 'bg-green-900/30 border border-green-800' : 'bg-gray-800'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-gray-300 font-medium truncate max-w-[60px]">{p.name}</span>
                    {p.isShooter && <span className="text-yellow-400">🎲</span>}
                    <span className="text-green-400 font-mono font-bold">{formatChips(p.chips)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dice area */}
            <div className="flex flex-col items-center py-2">
              <PointMarker point={game.point} />
              <DiceArea />
            </div>

            {/* Scrollable middle: active bets + betting buttons */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
              <BettingPanel send={send} mobile />
            </div>

            {/* Bottom bar: roll history link */}
            <div className="px-4 pb-2 pt-1 border-t border-gray-800">
              <button
                onClick={() => setShowHistory(true)}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1.5 transition-colors"
              >
                View Roll History {game.rollHistory?.length ? `(${game.rollHistory.length})` : ''}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
