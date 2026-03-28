import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import type { BetType } from '../../types/game';
import { MSG } from '../../types/websocket';
import { formatChips, betLabel, payoutLabel, centsFromDollars } from '../../utils/format';

interface Props {
  send: (type: string, payload: unknown) => void;
}

interface BetButton {
  type: BetType;
  label: string;
  payout: string;
  number?: number;
  pointPhaseOnly?: boolean;
}

const COME_OUT_BETS: BetButton[] = [
  { type: 'PASS_LINE', label: 'Pass Line', payout: '1:1' },
  { type: 'DONT_PASS', label: "Don't Pass", payout: '1:1' },
  { type: 'ANY_CRAPS', label: 'Any Craps', payout: '7:1' },
  { type: 'ANY_SEVEN', label: 'Any 7', payout: '4:1' },
  { type: 'HIGH_LOW', label: 'High (8-12)', payout: '1:1', number: 1 },
  { type: 'HIGH_LOW', label: 'Low (2-6)', payout: '1:1', number: 0 },
];

const POINT_PHASE_BETS: BetButton[] = [
  { type: 'PLACE', label: 'Place 4', payout: '9:5', number: 4 },
  { type: 'PLACE', label: 'Place 5', payout: '7:5', number: 5 },
  { type: 'PLACE', label: 'Place 6', payout: '7:6', number: 6 },
  { type: 'PLACE', label: 'Place 8', payout: '7:6', number: 8 },
  { type: 'PLACE', label: 'Place 9', payout: '7:5', number: 9 },
  { type: 'PLACE', label: 'Place 10', payout: '9:5', number: 10 },
  { type: 'HARDWAY', label: 'Hard 4', payout: '7:1', number: 4 },
  { type: 'HARDWAY', label: 'Hard 6', payout: '9:1', number: 6 },
  { type: 'HARDWAY', label: 'Hard 8', payout: '9:1', number: 8 },
  { type: 'HARDWAY', label: 'Hard 10', payout: '7:1', number: 10 },
];

export default function BettingPanel({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const [amount, setAmount] = useState('10');
  const [justPlaced, setJustPlaced] = useState<string | null>(null);

  if (!game) return null;

  const me = game.players.find((p) => p.id === myPlayerId);
  const isShooter = game.shooterId === myPlayerId;
  const isComeOut = game.phase === 'COME_OUT';
  const isPointPhase = game.phase === 'POINT_PHASE';
  const canBet = isComeOut || isPointPhase;

  if (!canBet) return null;

  // Pass/Dont-pass odds bets
  const passOddsBets: BetButton[] = isPointPhase && game.point
    ? [
        { type: 'PASS_ODDS', label: `Pass Odds (${game.point})`, payout: payoutLabel('PASS_ODDS', game.point) },
        { type: 'DONT_ODDS', label: `Don't Pass Odds (${game.point})`, payout: payoutLabel('DONT_ODDS', game.point) },
      ]
    : [];

  const handleBet = (bet: BetButton) => {
    const amountCents = centsFromDollars(parseFloat(amount));
    if (isNaN(amountCents) || amountCents <= 0) return;
    send(MSG.PLACE_BET, {
      gameId: game.id,
      betType: bet.type,
      amount: amountCents,
      number: bet.number ?? 0,
    });
    setJustPlaced(`${bet.label} ${formatChips(amountCents)}`);
    setTimeout(() => setJustPlaced(null), 2000);
  };

  const handleRoll = () => {
    send(MSG.ROLL_DICE, { gameId: game.id });
  };

  const myBets = me?.bets ?? [];

  return (
    <div className="space-y-4">
      {/* Bet placed confirmation */}
      {justPlaced && (
        <div className="bg-green-800/80 border border-green-600 text-green-200 text-sm font-medium px-4 py-2 rounded-lg text-center fade-in-up">
          ✓ Bet placed: {justPlaced}
        </div>
      )}

      {/* My active bets */}
      {myBets.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Your Bets</h3>
          <div className="space-y-1">
            {myBets.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{betLabel(b.type, b.number)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 font-mono">{formatChips(b.amount)}</span>
                  <button
                    onClick={() => send(MSG.REMOVE_BET, { gameId: game.id, betId: b.id })}
                    className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                    title="Remove bet"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet amount */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-400 whitespace-nowrap">Bet $</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-mono focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-1">
            {[5, 10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 px-2 py-1.5 rounded transition-colors"
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Come-out bets */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Core Bets</div>
          <div className="grid grid-cols-2 gap-2">
            {COME_OUT_BETS.map((bet, i) => (
              <BetBtn key={i} bet={bet} onBet={handleBet} />
            ))}
          </div>
        </div>

        {/* Odds bets (point phase) */}
        {passOddsBets.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Odds (True Odds — No House Edge)</div>
            <div className="grid grid-cols-2 gap-2">
              {passOddsBets.map((bet, i) => (
                <BetBtn key={i} bet={bet} onBet={handleBet} />
              ))}
            </div>
          </div>
        )}

        {/* Place & Hardway bets (point phase) */}
        {isPointPhase && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Place & Hardways</div>
            <div className="grid grid-cols-3 gap-2">
              {POINT_PHASE_BETS.map((bet, i) => (
                <BetBtn key={i} bet={bet} onBet={handleBet} small />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Roll button — shooter only */}
      {isShooter && (
        <button
          onClick={handleRoll}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-5 rounded-xl text-2xl transition-colors pulse-glow"
        >
          🎲 Roll Dice
        </button>
      )}

      {!isShooter && (
        <div className="text-center text-sm text-gray-500 py-2">
          Waiting for shooter to roll...
        </div>
      )}
    </div>
  );
}

function BetBtn({
  bet,
  onBet,
  small = false,
}: {
  bet: BetButton;
  onBet: (b: BetButton) => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={() => onBet(bet)}
      className={`flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500 rounded-lg transition-colors text-center ${
        small ? 'py-2 px-1' : 'py-3 px-2'
      }`}
    >
      <span className={`font-medium text-white ${small ? 'text-xs' : 'text-sm'}`}>{bet.label}</span>
      <span className="text-xs text-gray-400 mt-0.5">{bet.payout}</span>
    </button>
  );
}
