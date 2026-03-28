import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { MSG } from '../../types/websocket';
import { DieFaceCSS } from './DiceArea';

interface Props {
  send: (type: string, payload: unknown) => void;
}

export default function ShooterSelector({ send }: Props) {
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const diceTheme = useSelector((s: RootState) => s.ui.selectedDiceTheme);
  const [rolled, setRolled] = useState(false);

  // Reset optimistic roll flag on every new round (handles tie-breakers)
  useEffect(() => {
    setRolled(false);
  }, [game?.determineRound]);

  if (!game) return null;

  const myRolls = game.shooterDetermination?.filter(
    (r) => r.playerId === myPlayerId && r.round === game.determineRound
  );
  const hasRolled = myRolls && myRolls.length > 0;

  const handleRoll = () => {
    setRolled(true);
    send(MSG.ROLL_DETERMINATION, { gameId: game.id });
  };

  // Build a map of playerID → their latest die for current round
  const rollMap: Record<string, number> = {};
  game.shooterDetermination?.forEach((r) => {
    if (r.round === game.determineRound) {
      rollMap[r.playerId] = r.die;
    }
  });

  return (
    <div className="flex flex-col items-center gap-6 py-8 fade-in-up">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Determining Shooter</h2>
        <p className="text-gray-400 mt-1">Highest roll goes first — re-roll on ties</p>
        {game.determineRound > 1 && (
          <p className="text-yellow-400 text-sm mt-1">Tie-breaker round {game.determineRound}</p>
        )}
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        {game.players.map((p) => {
          const die = rollMap[p.id];
          return (
            <div
              key={p.id}
              className="flex flex-col items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-4 w-28 md:w-36"
            >
              <div className="text-sm font-medium text-gray-300">
                {p.name}
                {p.id === myPlayerId && <span className="text-gray-500 ml-1">(you)</span>}
              </div>
              <div className="flex items-center justify-center h-16 md:h-20">
                {die
                  ? <DieFaceCSS value={die} theme={diceTheme} size={56} />
                  : <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-600" />
                }
              </div>
              <div className={`text-sm font-bold ${die ? 'text-white' : 'text-gray-600'}`}>
                {die ? `Rolled ${die}` : 'Waiting...'}
              </div>
            </div>
          );
        })}
      </div>

      {!hasRolled && (
        <button
          onClick={handleRoll}
          disabled={rolled}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 px-8 md:py-4 md:px-10 rounded-xl text-lg md:text-xl transition-colors pulse-glow"
        >
          Roll!
        </button>
      )}

      {hasRolled && !game.shooterId && (
        <p className="text-gray-400">Waiting for other players to roll...</p>
      )}
    </div>
  );
}
