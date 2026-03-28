import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { MSG } from '../types/websocket';
import type {
  DiceRolledPayload,
  BetsResolvedPayload,
  PhaseChangedPayload,
  BetPlacedPayload,
  BetRemovedPayload,
  PlayerConnectionPayload,
  DeterminationRollPayload,
  ShooterDeterminedPayload,
} from '../types/websocket';
import type { Game } from '../types/game';
import {
  setGame,
  setWsConnected,
  setError,
  diceRolled,
  betResultsQueued,
  phaseChanged,
  betPlaced,
  betRemoved,
  playerConnectionChanged,
  determinationRollReceived,
  shooterDetermined,
} from '../store/gameSlice';

const WS_BASE = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

const MAX_BACKOFF = 30_000;

export function useWebSocket(gameId: string | null) {
  const dispatch = useDispatch<AppDispatch>();
  const playerToken = useSelector((s: RootState) => s.game.myPlayerToken);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const unmountedRef = useRef(false);
  const holdGameStateUntil = useRef<number>(0);
  const pendingGameState = useRef<Game | null>(null);

  const connect = useCallback(() => {
    if (!gameId || !playerToken || unmountedRef.current) return;

    const url = `${WS_BASE}/ws/${gameId}?token=${encodeURIComponent(playerToken)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      dispatch(setWsConnected(true));
    };

    ws.onmessage = (event) => {
      try {
        const msg: { type: string; payload: unknown } = JSON.parse(event.data);
        handleMessage(msg.type, msg.payload);
      } catch (e) {
        console.error('ws parse error', e);
      }
    };

    ws.onclose = () => {
      dispatch(setWsConnected(false));
      if (!unmountedRef.current) scheduleReconnect();
    };

    ws.onerror = (e) => {
      console.error('ws error', e);
      ws.close();
    };
  }, [gameId, playerToken]);

  const delayIfHeld = (fn: () => void) => {
    const now = Date.now();
    const delay = holdGameStateUntil.current - now;
    if (delay > 0) setTimeout(fn, delay);
    else fn();
  };

  const handleMessage = (type: string, payload: unknown) => {
    switch (type) {
      case MSG.GAME_STATE: {
        const now = Date.now();
        if (holdGameStateUntil.current > now) {
          pendingGameState.current = payload as Game;
          setTimeout(() => {
            if (pendingGameState.current) {
              dispatch(setGame(pendingGameState.current));
              pendingGameState.current = null;
            }
          }, holdGameStateUntil.current - now);
        } else {
          dispatch(setGame(payload as Game));
        }
        break;
      }
      case MSG.DICE_ROLLED:
        dispatch(diceRolled(payload as DiceRolledPayload));
        // Hold GAME_STATE until dice animation completes (~950ms)
        holdGameStateUntil.current = Date.now() + 950;
        break;
      case MSG.BETS_RESOLVED: {
        const p = payload as BetsResolvedPayload;
        delayIfHeld(() => dispatch(betResultsQueued(p)));
        break;
      }
      case MSG.PHASE_CHANGED: {
        const p = payload as PhaseChangedPayload;
        delayIfHeld(() => dispatch(phaseChanged(p)));
        break;
      }
      case MSG.BET_PLACED:
        dispatch(betPlaced(payload as BetPlacedPayload));
        break;
      case MSG.BET_REMOVED:
        dispatch(betRemoved(payload as BetRemovedPayload));
        break;
      case MSG.PLAYER_CONNECTION:
        dispatch(playerConnectionChanged(payload as PlayerConnectionPayload));
        break;
      case MSG.DETERMINATION_ROLL:
        dispatch(determinationRollReceived(payload as DeterminationRollPayload));
        break;
      case MSG.SHOOTER_DETERMINED: {
        const p = payload as ShooterDeterminedPayload;
        dispatch(shooterDetermined(p));
        holdGameStateUntil.current = Date.now() + 2500;
        break;
      }
      case MSG.ERROR: {
        const e = payload as { message: string };
        dispatch(setError(e.message));
        break;
      }
    }
  };

  const scheduleReconnect = () => {
    const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF);
    attemptRef.current++;
    reconnectTimeout.current = setTimeout(connect, delay);
  };

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { send };
}
