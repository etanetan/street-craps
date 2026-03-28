import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { PendingBetRequest } from '../../types/game';
import { MSG } from '../../types/websocket';
import { formatChips, betLabel } from '../../utils/format';

interface Props {
  send: (type: string, payload: unknown) => void;
}

export default function BetApprovalModal({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);

  if (!game || !myPlayerId) return null;

  // Find a pending request where I'm the fader
  const request: PendingBetRequest | undefined = game.pendingBetRequests?.find(
    (r) => r.faderPlayerId === myPlayerId
  );

  if (!request) return null;

  const shooter = game.players.find((p) => p.id === request.shooterPlayerId);
  const betName = betLabel(request.betType === 'PASS_LINE' ? 'DONT_PASS' : 'LAY_PLACE', request.number || undefined);

  const approve = () => send(MSG.APPROVE_BET, { gameId: game.id, requestId: request.id });
  const reject = () => send(MSG.REJECT_BET, { gameId: game.id, requestId: request.id });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5 fade-in-up">
        <div className="text-center">
          <div className="text-3xl mb-2">🎲</div>
          <h2 className="text-white font-bold text-lg">Bet Request</h2>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-white font-medium">{shooter?.name ?? 'Shooter'}</span> wants to bet{' '}
            <span className="text-green-400 font-mono font-bold">{formatChips(request.amount)}</span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Their bet</span>
            <span className="text-white font-medium">
              {betLabel(request.betType, request.number || undefined)} — {formatChips(request.amount)}
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Your counter-bet</span>
            <span className="text-white font-medium">{betName}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between text-gray-400">
            <span>You can cover</span>
            <span className={`font-mono font-bold ${request.faderCanCover < request.amount ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatChips(request.faderCanCover)}
              {request.faderCanCover < request.amount && (
                <span className="text-gray-500 font-normal ml-1">of {formatChips(request.amount)}</span>
              )}
            </span>
          </div>
        </div>

        {request.faderCanCover < request.amount && (
          <p className="text-xs text-yellow-400 text-center">
            Accepting will commit all your remaining chips ({formatChips(request.faderCanCover)}) to this bet.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={reject}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold border border-gray-700 transition-colors"
          >
            Deny
          </button>
          <button
            onClick={approve}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
