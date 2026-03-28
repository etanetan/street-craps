import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { PendingBetRequest } from '../../types/game';
import { MSG } from '../../types/websocket';
import { formatChips, betLabel, centsFromDollars } from '../../utils/format';

interface Props {
  send: (type: string, payload: unknown) => void;
}

const LAY_RATIO: Record<number, [number, number]> = {
  4: [2, 1], 10: [2, 1],
  5: [3, 2],  9: [3, 2],
  6: [6, 5],  8: [6, 5],
};

const TOP_UP_PRESETS = [25, 50, 100, 200, 500];

function requiredCover(req: PendingBetRequest): number {
  if (req.betType === 'PLACE') {
    const [num, den] = LAY_RATIO[req.number] ?? [1, 1];
    return Math.floor(req.amount * num / den);
  }
  return req.amount; // PASS_LINE → DONT_PASS is 1:1
}

export default function BetApprovalModal({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);

  if (!game || !myPlayerId) return null;

  const request: PendingBetRequest | undefined = game.pendingBetRequests?.find(
    (r) => r.faderPlayerId === myPlayerId
  );
  if (!request) return null;

  const me = game.players.find((p) => p.id === myPlayerId);
  const shooter = game.players.find((p) => p.id === request.shooterPlayerId);
  const myChips = me?.chips ?? 0;
  const required = requiredCover(request);
  const stillNeeds = Math.max(0, required - myChips);
  const faderBetLabel = betLabel(request.betType === 'PASS_LINE' ? 'DONT_PASS' : 'LAY_PLACE', request.number || undefined);

  const topUp = (dollars: number) =>
    send(MSG.TOP_UP, { gameId: game.id, amount: centsFromDollars(dollars) });
  const approve = () => send(MSG.APPROVE_BET, { gameId: game.id, requestId: request.id });
  const reject  = () => send(MSG.REJECT_BET,  { gameId: game.id, requestId: request.id });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5 fade-in-up">

        {/* Header */}
        <div className="text-center">
          <div className="text-3xl mb-2">🎲</div>
          <h2 className="text-white font-bold text-lg">Bet Request</h2>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-white font-medium">{shooter?.name ?? 'Shooter'}</span>{' '}
            wants to bet{' '}
            <span className="text-green-400 font-mono font-bold">{formatChips(request.amount)}</span>
          </p>
        </div>

        {/* Bet breakdown */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Their bet</span>
            <span className="text-white font-medium">
              {betLabel(request.betType, request.number || undefined)} — {formatChips(request.amount)}
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Your counter-bet</span>
            <span className="text-white font-medium">{faderBetLabel}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between text-gray-400">
            <span>Required to cover</span>
            <span className="text-white font-mono font-bold">{formatChips(required)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Your chips</span>
            <span className={`font-mono font-bold ${myChips >= required ? 'text-green-400' : 'text-yellow-400'}`}>
              {formatChips(myChips)}
            </span>
          </div>
        </div>

        {/* Top-up section — only show if they can't fully cover */}
        {myChips < required && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center">
              Add chips to cover the full amount
              {stillNeeds > 0 && (
                <span className="text-yellow-400"> (need {formatChips(stillNeeds)} more)</span>
              )}
            </p>
            <div className="flex gap-1.5">
              {TOP_UP_PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => topUp(v)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  +${v}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 text-center">
              Or accept with {formatChips(myChips)} — your partial cover
            </p>
          </div>
        )}

        {myChips >= required && (
          <p className="text-xs text-green-500 text-center">
            ✓ You have enough to fully cover this bet
          </p>
        )}

        {/* Accept / Deny */}
        <div className="flex gap-3">
          <button
            onClick={reject}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold border border-gray-700 transition-colors"
          >
            Deny
          </button>
          <button
            onClick={approve}
            disabled={myChips <= 0}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {myChips >= required ? 'Accept' : `Accept (${formatChips(myChips)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
