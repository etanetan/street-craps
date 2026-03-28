# Street Craps

Real-time multiplayer street craps for two players. One player creates a game, shares the link, and you play.

**Live:** https://street-craps.vercel.app

---

## How to Play

1. **Create a game** — enter your name, buy-in amount, and pick a dice theme
2. **Share the link** — copy the game code/URL and send it to your opponent
3. **Start** — once both players are in the lobby, the host clicks Start Game
4. **Determine the shooter** — each player rolls; highest roll goes first (re-roll on ties)
5. **Play** — the shooter places a Pass Line bet; the opponent is automatically matched with a Don't Pass bet for the same amount

---

## Rules

### Come-Out Roll (first roll of each round)
| Result | Shooter (Pass Line) | Opponent (Don't Pass) |
|---|---|---|
| **7 or 11** (Natural) | Win | Lose |
| **2, 3, or 12** (Craps) | Lose | Win (12 = push) |
| **4, 5, 6, 8, 9, 10** | Point is set — round continues | Point is set — round continues |

### Point Phase (after point is established)
The rolled number becomes **the point**. The shooter keeps rolling until:

| Result | Shooter (Pass Line) | Opponent (Don't Pass) |
|---|---|---|
| **Roll the point again** | Win | Lose |
| **Roll a 7** (Seven-Out) | Lose + pass dice | Win |
| **Any other number** | Round continues | Round continues |

### Additional Bets (optional)
Available after the point is set. Can be placed alongside the main Pass Line bet:

| Bet | Pays | When |
|---|---|---|
| Pass/Don't Pass Odds | True odds (no house edge) | Point phase only |
| Place 4/10 | 9:5 | Hits number before 7 |
| Place 5/9 | 7:5 | Hits number before 7 |
| Place 6/8 | 7:6 | Hits number before 7 |
| Hard 4/10 | 7:1 | Both dice equal (e.g. 2+2), before 7 or soft hit |
| Hard 6/8 | 9:1 | Both dice equal (e.g. 3+3), before 7 or soft hit |
| Any Craps | 7:1 | Next roll is 2, 3, or 12 |
| Any 7 | 4:1 | Next roll is 7 |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind + Redux Toolkit |
| Backend | Go (gorilla/websocket, net/http) |
| Database | Google Cloud Firestore |
| Real-time | WebSockets — server-side dice rolls only |
| Auth | JWT (HS256) — accounts for stat tracking, guest play supported |
| Deploy | Vercel (frontend) + Cloud Run (backend, us-central1) |

## Development

```bash
# Backend
cd backend && go run ./cmd/server

# Frontend
cd frontend && npm install && npm run dev
```

Set `VITE_API_URL` and `VITE_WS_URL` in `frontend/.env.local` to point at your backend.
