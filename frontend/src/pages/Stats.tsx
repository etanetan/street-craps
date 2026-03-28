import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import api from '../services/api';
import { formatChips } from '../utils/format';

interface Stats {
  gamesPlayed: number;
  diceRolled: number;
  netChips: number;
  biggestWin: number;
  biggestLoss: number;
}

export default function StatsPage() {
  const { userId, isAuthenticated } = { userId: useSelector((s: RootState) => s.auth.userId), isAuthenticated: !!useSelector((s: RootState) => s.auth.accessToken) };
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!userId) return;
    api.get(`/api/users/${userId}/stats`)
      .then((res) => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        Loading stats...
      </div>
    );
  }

  const netColor = !stats ? 'text-white' : stats.netChips >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Your Stats</h1>
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Games Played" value={String(stats.gamesPlayed)} />
          <StatCard label="Dice Rolled" value={String(stats.diceRolled)} />
          <StatCard label="Net Profit/Loss" value={formatChips(stats.netChips)} valueClass={netColor} />
          <StatCard label="Biggest Win" value={formatChips(stats.biggestWin)} valueClass="text-green-400" />
          <StatCard label="Biggest Loss" value={formatChips(Math.abs(stats.biggestLoss))} valueClass="text-red-400" />
        </div>
      ) : (
        <p className="text-gray-400">No stats yet — play a game!</p>
      )}
    </div>
  );
}

function StatCard({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-center">
      <div className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
