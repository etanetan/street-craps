import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { DieFaceCSS } from './DiceArea';

export default function GameLog() {
  const game = useSelector((s: RootState) => s.game.game);
  if (!game || !game.rollHistory?.length) return null;

  const recent = [...game.rollHistory].reverse().slice(0, 10);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Roll History</h3>
      <div className="space-y-1.5">
        {recent.map((roll, i) => {
          const isNatural = roll.total === 7 || roll.total === 11;
          const isCraps = roll.total === 2 || roll.total === 3 || roll.total === 12;
          const isPoint = game.point > 0 && game.point === roll.total;
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${i === 0 ? 'bg-gray-700' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <DieFaceCSS value={roll.die1} size={28} />
                <DieFaceCSS value={roll.die2} size={28} />
              </div>
              <span
                className={`font-bold text-sm tabular-nums ${
                  isNatural ? 'text-green-400' :
                  isCraps ? 'text-red-400' :
                  isPoint ? 'text-yellow-400' :
                  'text-white'
                }`}
              >
                = {roll.total}
                {isNatural ? ' 🎉' : isCraps ? ' ✗' : isPoint ? ' ⭐' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
