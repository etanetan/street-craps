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

// Lay multipliers: how much the non-shooter must put up for each place number
const LAY_RATIO: Record<number, [number, number]> = {
  4: [2, 1], 10: [2, 1],
  5: [3, 2],  9: [3, 2],
  6: [6, 5],  8: [6, 5],
};

export default function BettingPanel({ send, mobile = false }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
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

  const passLineMax = isComeOut && isShooter && opponent
    ? Math.min(me?.chips ?? 0, opponent.chips)
    : null;

  const rawCents = centsFromDollars(parseFloat(amount));
  const amountCents = Math.min(rawCents, me?.chips ?? 0);

  const placeBet = (betType: string, num: number, overrideCents?: number) => {
    let cents = overrideCents ?? amountCents;
    if (isNaN(cents) || cents <= 0) return;
    if (betType === 'PASS_LINE' && passLineMax !== null) cents = Math.min(cents, passLineMax);
    send(MSG.PLACE_BET, { gameId: game.id, betType, amount: cents, number: num });
    setJustPlaced(`${betLabel(betType, num || undefined)} ${formatChips(cents)}`);
    setTimeout(() => setJustPlaced(null), 2000);
  };

  const handleRoll = () => {
    if (isComeOut && !hasPassLine) {
      let cents = amountCents;
      if (passLineMax !== null) cents = Math.min(cents, passLineMax);
      if (isNaN(cents) || cents <= 0) return;
      send(MSG.PLACE_BET, { gameId: game.id, betType: 'PASS_LINE', amount: cents, number: 0 });
    }
    send(MSG.ROLL_DICE, { gameId: game.id });
  };

  const canAffordPlace = (n: number): boolean => {
    if (!me || !opponent) return false;
    const [num, den] = LAY_RATIO[n] ?? [1, 1];
    const layAmt = Math.floor(amountCents * num / den);
    return me.chips >= amountCents && opponent.chips >= layAmt;
  };

  const myBets = me?.bets ?? [];
  const hasPassLine = myBets.some(b => b.type === 'PASS_LINE' || b.type === 'DONT_PASS');

  return (
    <div className={mobile ? 'flex flex-col h-full gap-2' : 'space-y-3'}>
      {/* Toast */}
      <div className="relative h-0">
        {justPlaced && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-green-800/95 border border-green-600 text-green-200 text-sm font-medium px-4 py-2 rounded-lg text-center shadow-lg pointer-events-none">
            ✓ {justPlaced}
          </div>
        )}
      </div>

      {/* Active bets — compact pills on mobile, full card on desktop */}
      {mobile ? (
        <div className="relative" style={{ height: 28 }}>
          <div className="absolute inset-0 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden">
            {myBets.map((b) => (
              <div key={b.id} className="flex items-center gap-1 bg-green-900/40 border border-green-800 rounded-full px-2.5 py-1 text-xs shrink-0">
                <span className="text-gray-300">{betLabel(b.type, b.number)}</span>
                <span className="text-green-400 font-mono font-bold">{formatChips(b.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
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
      )}

      {/* Bet controls */}
      {(isShooter || (!isShooter && isPointPhase)) && (
        <div className={`bg-gray-900 border border-gray-700 rounded-xl ${mobile ? 'p-3' : 'p-4'}`}>
          <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-mono text-lg focus:outline-none focus:border-green-500"
          />
          <div className={`flex gap-1.5 mt-2 ${mobile ? 'mb-3' : 'mb-4'}`}>
            {[1, 5, 10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`flex-1 font-medium rounded-lg transition-colors ${mobile ? 'text-xs py-1' : 'text-xs py-1.5'} ${
                  amount === String(v)
                    ? 'bg-green-700 text-white border border-green-500'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* Come-out: cap notice — always reserve the space */}
          <div className="h-4">
            {isShooter && isComeOut && passLineMax !== null && passLineMax < amountCents && (
              <p className="text-xs text-yellow-500 text-center">
                Capped at {formatChips(passLineMax)} (opponent's balance)
              </p>
            )}
          </div>

          {/* Number buttons */}
          {isShooter && (isComeOut || isPointPhase) && (
            <div>
              <div className={`text-xs mb-2 ${isPointPhase ? 'text-gray-500' : 'text-gray-700'}`}>
                Place a Number (wins on hit, loses on 7)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLACE_NUMBERS.map((n) => {
                  const alreadyBet = myBets.some(b => b.type === 'PLACE' && b.number === n);
                  const locked = isComeOut;
                  const cantAfford = isPointPhase && !alreadyBet && !canAffordPlace(n);
                  const disabled = locked || alreadyBet || cantAfford;
                  return (
                    <button
                      key={n}
                      onClick={() => !disabled && placeBet('PLACE', n)}
                      disabled={disabled}
                      className={`flex flex-col items-center justify-center rounded-lg px-2 border transition-colors ${mobile ? 'py-1.5' : 'py-3'} ${
                        locked || cantAfford
                          ? 'border-gray-800 bg-gray-900 opacity-30 cursor-not-allowed'
                          : alreadyBet
                          ? 'border-green-700 bg-green-900/30 opacity-60 cursor-not-allowed'
                          : 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-green-500'
                      }`}
                    >
                      <span className={`font-bold text-white ${mobile ? 'text-base' : 'text-lg'}`}>{n}</span>
                      <span className="text-xs text-gray-400">{payoutLabel('PLACE', n)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roll button */}
      {isShooter && (
        <div className={mobile ? 'mt-auto pb-1' : ''}>
          <button
            onClick={handleRoll}
            className={`w-full text-white font-bold rounded-xl bg-green-600 hover:bg-green-500 pulse-glow transition-colors ${mobile ? 'py-3 text-lg' : 'py-5 text-2xl'}`}
          >
            🎲 Roll Dice
          </button>
        </div>
      )}

      {!isShooter && (
        <div className={`text-center text-sm text-gray-500 py-2 ${mobile ? 'mt-auto' : ''}`}>
          Waiting for shooter to roll...
        </div>
      )}
    </div>
  );
}
