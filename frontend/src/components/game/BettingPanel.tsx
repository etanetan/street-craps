import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { MSG } from '../../types/websocket';
import { formatChips, betLabel, payoutLabel, centsFromDollars } from '../../utils/format';

interface Props {
  send: (type: string, payload: unknown) => void;
  mobile?: boolean;
}

const PLACE_NUMBERS = [4, 5, 6, 8, 9, 10];

export default function BettingPanel({ send, mobile = false }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const lastShooterBets = useSelector((s: RootState) => s.game.lastShooterBets);
  const [amount, setAmount] = useState('10');
  const [justPlaced, setJustPlaced] = useState<string | null>(null);

  if (!game) return null;

  const me = game.players.find((p) => p.id === myPlayerId);
  const opponent = game.players.find((p) => p.id !== myPlayerId);
  const isShooter = game.shooterId === myPlayerId;
  const isComeOut = game.phase === 'COME_OUT';
  const isPointPhase = game.phase === 'POINT_PHASE';
  const canBet = isComeOut || isPointPhase;

  if (!canBet) return null;

  // Pass Line cap: non-shooter auto-matches, so max = opponent's chips
  const passLineMax = isComeOut && isShooter && opponent ? opponent.chips : null;

  const amountCents = centsFromDollars(parseFloat(amount));

  const placeBet = (betType: string, num: number, overrideCents?: number) => {
    let cents = overrideCents ?? amountCents;
    if (isNaN(cents) || cents <= 0) return;

    if (betType === 'PASS_LINE' && passLineMax !== null) {
      cents = Math.min(cents, passLineMax);
      if (cents <= 0) return;
    }

    send(MSG.PLACE_BET, { gameId: game.id, betType, amount: cents, number: num });
    setJustPlaced(`${betLabel(betType, num || undefined)} ${formatChips(cents)}`);
    setTimeout(() => setJustPlaced(null), 2000);
  };

  const handleRepeatBets = () => {
    for (const b of lastShooterBets) {
      let cents = b.amount;
      if ((b.type === 'PASS_LINE') && passLineMax !== null) {
        cents = Math.min(cents, passLineMax);
      }
      if (cents > 0) send(MSG.PLACE_BET, { gameId: game.id, betType: b.type, amount: cents, number: b.number });
    }
    const total = lastShooterBets.reduce((s, b) => s + b.amount, 0);
    setJustPlaced(`Same as last roll (${formatChips(total)})`);
    setTimeout(() => setJustPlaced(null), 2000);
  };

  const handleRoll = () => send(MSG.ROLL_DICE, { gameId: game.id });

  const myBets = me?.bets ?? [];

  const canRepeat = isShooter && isComeOut && lastShooterBets.length > 0 && myBets.length === 0 &&
    lastShooterBets.every(b => {
      const cap = b.type === 'PASS_LINE' && passLineMax !== null ? passLineMax : Infinity;
      return (me?.chips ?? 0) >= Math.min(b.amount, cap);
    });

  const hasPassLine = myBets.some(b => b.type === 'PASS_LINE' || b.type === 'DONT_PASS');
  const needsBetToRoll = isComeOut && !hasPassLine;

  return (
    <div className="space-y-4">
      {/* Toast — zero-height, no layout shift */}
      <div className="relative h-0">
        {justPlaced && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-green-800/95 border border-green-600 text-green-200 text-sm font-medium px-4 py-2 rounded-lg text-center shadow-lg pointer-events-none">
            ✓ {justPlaced}
          </div>
        )}
      </div>

      {/* My active bets */}
      <div className="bg-gray-900 border border-green-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-green-400 uppercase tracking-wider">Your Bets on the Board</h3>
          {myBets.length > 0 && (
            <span className="text-xs text-gray-400 font-mono">
              Total: {formatChips(myBets.reduce((s, b) => s + b.amount, 0))}
            </span>
          )}
        </div>
        {myBets.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No bets placed yet</p>
        ) : (
          <div className="space-y-1.5">
            {myBets.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-gray-200 font-medium">{betLabel(b.type, b.number)}</span>
                <span className="text-green-400 font-mono font-bold">{formatChips(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bet controls — only show if shooter can place bets */}
      {(isShooter || (!isShooter && isPointPhase)) && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-mono text-lg focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-1.5 mt-2 mb-4">
            {[1, 5, 10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  amount === String(v)
                    ? 'bg-green-700 text-white border border-green-500'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* Come-out: Pass Line only */}
          {isShooter && isComeOut && (
            <div className="space-y-2">
              <button
                onClick={() => placeBet('PASS_LINE', 0)}
                className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500 rounded-lg px-4 py-3 transition-colors"
              >
                <span className="font-medium text-white">Pass Line</span>
                <span className="text-xs text-gray-400">1:1</span>
              </button>
              {passLineMax !== null && passLineMax < amountCents && (
                <p className="text-xs text-yellow-500 text-center">
                  Capped at {formatChips(passLineMax)} (opponent's balance)
                </p>
              )}
              {canRepeat && (
                <button
                  onClick={handleRepeatBets}
                  className="w-full text-xs font-medium py-2 rounded-lg bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700 hover:border-blue-500 transition-colors"
                >
                  ↺ Same as last — {lastShooterBets.map(b => `${betLabel(b.type, b.number || undefined)} ${formatChips(b.amount)}`).join(' + ')}
                </button>
              )}
            </div>
          )}

          {/* Point phase: Place bets on numbers */}
          {isShooter && isPointPhase && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Place a Number (wins on hit, loses on 7)</div>
              <div className="grid grid-cols-3 gap-2">
                {PLACE_NUMBERS.map((n) => {
                  const alreadyBet = myBets.some(b => b.type === 'PLACE' && b.number === n);
                  return (
                    <button
                      key={n}
                      onClick={() => placeBet('PLACE', n)}
                      disabled={alreadyBet}
                      className={`flex flex-col items-center justify-center rounded-lg px-2 py-3 border transition-colors ${
                        alreadyBet
                          ? 'border-green-700 bg-green-900/30 opacity-60 cursor-not-allowed'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-green-500'
                      }`}
                    >
                      <span className="font-bold text-white text-lg">{n}</span>
                      <span className="text-xs text-gray-400">{payoutLabel('PLACE', n)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roll button — shooter only */}
      {isShooter && (
        <div>
          <button
            onClick={handleRoll}
            disabled={needsBetToRoll}
            className={`w-full text-white font-bold rounded-xl transition-colors ${mobile ? 'py-4 text-xl' : 'py-5 text-2xl'} ${
              needsBetToRoll
                ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 pulse-glow'
            }`}
          >
            🎲 Roll Dice
          </button>
          {needsBetToRoll && (
            <p className="text-center text-xs text-yellow-500 mt-1.5">Place a Pass Line bet first</p>
          )}
        </div>
      )}

      {!isShooter && (
        <div className="text-center text-sm text-gray-500 py-2">
          Waiting for shooter to roll...
        </div>
      )}
    </div>
  );
}
