import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { setMyPlayer, setGame } from '../store/gameSlice';
import { useWebSocket } from '../hooks/useWebSocket';
import GameTable from '../components/game/GameTable';
import api from '../services/api';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const game = useSelector((s: RootState) => s.game.game);
  const myPlayerId = useSelector((s: RootState) => s.game.myPlayerId);
  const myPlayerToken = useSelector((s: RootState) => s.game.myPlayerToken);
  // gameId extracted from game object once loaded

  // Reload recovery: check localStorage
  useEffect(() => {
    if (!code) return;
    if (myPlayerId && myPlayerToken) return; // already have session in memory

    const stored = localStorage.getItem(`craps_session_${code}`);
    if (!stored) {
      // Not joined — redirect home with the code pre-filled
      navigate(`/?join=${code}`);
      return;
    }

    const { playerId, playerToken } = JSON.parse(stored);
    dispatch(setMyPlayer({ playerId, playerToken }));

    // Re-fetch game state
    api.get(`/api/games/${code}`)
      .then((res) => dispatch(setGame(res.data)))
      .catch(() => navigate('/'));
  }, [code]);

  const { send } = useWebSocket(game?.id ?? null);

  if (!code) return null;

  return <GameTable send={send} />;
}
