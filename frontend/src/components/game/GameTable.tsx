import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { clearError, clearRollOutcome } from '../../store/gameSlice';
import { formatChips } from '../../utils/format';
import { MSG } from '../../types/websocket';
import DiceArea from './DiceArea';
import BettingPanel from './BettingPanel';
import GameLog from './GameLog';
import PlayerList from './PlayerList';
import PointMarker from './PointMarker';
import ShooterSelector from './ShooterSelector';
import BustModal from './BustModal';
import BetApprovalModal from './BetApprovalModal';
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

  const endGameVotes = game?.endGameVotes ?? [];
  const iHaveVoted = endGameVotes.includes(myPlayerId ?? '');
  const opponentVoted = endGameVotes.some(id => id !== myPlayerId);
  const requestingPlayer = game?.players.find(p => endGameVotes.includes(p.id) && p.id !== myPlayerId);

  const requestEndGame = () => send(MSG.END_GAME, { gameId: game?.id });
  const cancelEndGame = () => send(MSG.CANCEL_END_GAME, { gameId: game?.id });

  const inGame = game?.phase === 'COME_OUT' || game?.phase === 'POINT_PHASE';

  // Warn before closing/refreshing tab during an active game
  useEffect(() => {
    if (!inGame) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [inGame]);

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
          rollOutcome.net > 0 ? 'bg-green-700/70 text-green-100 backdrop-blur-sm' :
          rollOutcome.net < 0 ? 'bg-red-800/70 text-red-100 backdrop-blur-sm' :
          'bg-gray-700/70 text-gray-100 backdrop-blur-sm'
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

      <BetApprovalModal send={send} />

      {bustedPlayer && game && (
        <BustModal
          gameId={game.id}
          playerName={bustedPlayer.name}
          isMe={bustedPlayer.id === myPlayerId}
          send={send}
        />
      )}

      {/* End-game confirmation overlay */}
      {opponentVoted && !iHaveVoted && game && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 text-center space-y-4">
            <div className="text-2xl">🏁</div>
            <p className="text-white font-semibold text-lg">
              {requestingPlayer?.name ?? 'Your opponent'} wants to end the game
            </p>
            <p className="text-gray-400 text-sm">Do you want to end the session and save stats?</p>
            <div className="flex gap-3">
              <button
                onClick={cancelEndGame}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium border border-gray-700 transition-colors"
              >
                Keep Playing
              </button>
              <button
                onClick={requestEndGame}
                className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-medium transition-colors"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
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
              <div className="space-y-4">
                <BettingPanel send={send} />
                {inGame && (
                  <div className="text-center">
                    {iHaveVoted ? (
                      <div className="space-y-2">
                        <p className="text-xs text-yellow-400">Waiting for opponent to confirm end...</p>
                        <button onClick={cancelEndGame} className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors">Cancel request</button>
                      </div>
                    ) : (
                      <button
                        onClick={requestEndGame}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Request End Game
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── MOBILE layout (< lg) ── */}
          <div className="lg:hidden flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
            {/* Top bar: phase + players */}
            <div className="flex-none flex items-center justify-between px-3 pt-3 pb-4 gap-2">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                game.phase === 'COME_OUT' ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
              }`}>
                {game.phase === 'COME_OUT' ? 'Come-Out' : `Point: ${game.point}`}
              </div>
              <div className="flex gap-1.5 min-w-0 shrink">
                {game.players.map(p => (
                  <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs min-w-0 ${
                    p.id === myPlayerId ? 'bg-green-900/30 border border-green-800' : 'bg-gray-800'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-gray-300 font-medium truncate max-w-[48px]">{p.name}</span>
                    {p.isShooter && <span className="text-yellow-400 shrink-0">🎲</span>}
                    <span className="text-green-400 font-mono font-bold shrink-0">{formatChips(p.chips)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact horizontal dice row */}
            <div className="flex-none">
              <DiceArea mobile point={game.point} />
            </div>

            {/* Betting panel — fills remaining space, no scroll */}
            <div className="flex-1 min-h-0 px-4">
              <BettingPanel send={send} mobile />
            </div>

            {/* Bottom bar: roll history + end game */}
            <div className="flex-none px-4 pb-3 pt-1 border-t border-gray-800 flex items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="flex-1 text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors"
              >
                Roll History {game.rollHistory?.length ? `(${game.rollHistory.length})` : ''}
              </button>
              <div className="w-px h-4 bg-gray-700" />
              {iHaveVoted ? (
                <button onClick={cancelEndGame} className="text-xs text-yellow-500 hover:text-yellow-300 py-1 transition-colors">
                  Cancel end request
                </button>
              ) : (
                <button onClick={requestEndGame} className="text-xs text-gray-600 hover:text-red-400 py-1 transition-colors">
                  End Game
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
