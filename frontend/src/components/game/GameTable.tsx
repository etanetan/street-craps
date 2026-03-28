import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import DiceArea from './DiceArea';
import BettingPanel from './BettingPanel';
import GameLog from './GameLog';
import PlayerList from './PlayerList';
import PointMarker from './PointMarker';
import ShooterSelector from './ShooterSelector';
import WaitingRoom from '../lobby/WaitingRoom';

interface Props {
  send: (type: string, payload: unknown) => void;
}

export default function GameTable({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const wsConnected = useSelector((s: RootState) => s.game.wsConnected);
  const error = useSelector((s: RootState) => s.game.lastError);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Connection status */}
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

      {/* Phase: WAITING */}
      {game.phase === 'WAITING' && <WaitingRoom send={send} />}

      {/* Phase: SHOOTER_DETERMINATION */}
      {game.phase === 'SHOOTER_DETERMINATION' && <ShooterSelector send={send} />}

      {/* Phase: COME_OUT or POINT_PHASE */}
      {(game.phase === 'COME_OUT' || game.phase === 'POINT_PHASE') && (
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: players + log */}
          <div className="space-y-4">
            <PlayerList />
            <GameLog />
          </div>

          {/* Center column: dice + status */}
          <div className="flex flex-col items-center gap-4">
            {/* Phase badge */}
            <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              game.phase === 'COME_OUT'
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
            }`}>
              {game.phase === 'COME_OUT' ? 'Come-Out Roll' : 'Point Phase'}
            </div>

            <PointMarker point={game.point} />
            <DiceArea />
          </div>

          {/* Right column: betting */}
          <div>
            <BettingPanel send={send} />
          </div>
        </div>
      )}
    </div>
  );
}
