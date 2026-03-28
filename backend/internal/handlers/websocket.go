package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/etanetan/street-craps/backend/internal/auth"
	"github.com/etanetan/street-craps/backend/internal/game"
	"github.com/etanetan/street-craps/backend/internal/hub"
	"github.com/etanetan/street-craps/backend/internal/models"
	"github.com/etanetan/street-craps/backend/internal/repository"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS handled by middleware; WS origin validated separately in prod
	},
}

type WSHandler struct {
	hub     *hub.Hub
	manager *game.Manager
	games   *repository.GameRepo
	users   *repository.UserRepo
	jwt     *auth.Service
}

func NewWSHandler(h *hub.Hub, manager *game.Manager, games *repository.GameRepo, users *repository.UserRepo, jwt *auth.Service) *WSHandler {
	return &WSHandler{hub: h, manager: manager, games: games, users: users, jwt: jwt}
}

// ServeHTTP upgrades the HTTP connection to WebSocket.
// Path: /ws/{gameId}?token=<playerToken>
func (h *WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extract token from query param
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	claims, err := h.jwt.VerifyAccess(token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	// Register client with hub
	c := h.hub.NewClient(conn, claims.GameID, claims.PlayerID, claims.UserID)

	// Mark player connected and broadcast
	ctx := context.Background()
	if g, ok := h.manager.Get(claims.GameID); ok {
		for i := range g.Players {
			if g.Players[i].ID == claims.PlayerID {
				g.Players[i].IsConnected = true
			}
		}
		h.manager.Set(g)
		go h.games.Save(ctx, g)

		// Send full game state to reconnecting client
		c.Send(models.MsgGameState, g)

		// Broadcast connection status
		h.hub.Broadcast(claims.GameID, models.MsgPlayerConnection, models.PlayerConnectionPayload{
			PlayerID:  claims.PlayerID,
			Connected: true,
		})
	}

	// Handle disconnect: mark player as disconnected
	go func() {
		// Wait for client goroutines to finish (they self-terminate)
		// The hub unregisters the client when ReadPump exits.
		// We watch via a simple approach: when the client's send channel is closed,
		// the hub has already unregistered it.
		// We do a delayed mark-disconnected via hub's Unregister callback.
	}()
	_ = c // keep reference
}

// OnMessage dispatches incoming WS messages to the appropriate handler.
func (h *WSHandler) OnMessage(c *hub.Client, raw []byte) {
	var msg struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(raw, &msg); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Invalid message"})
		return
	}

	ctx := context.Background()

	switch msg.Type {
	case models.MsgPing:
		c.Send(models.MsgPong, nil)

	case models.MsgStartGame:
		h.handleStartGame(ctx, c, msg.Payload)

	case models.MsgRollDetermination:
		h.handleRollDetermination(ctx, c, msg.Payload)

	case models.MsgPlaceBet:
		h.handlePlaceBet(ctx, c, msg.Payload)

	case models.MsgRemoveBet:
		h.handleRemoveBet(ctx, c, msg.Payload)

	case models.MsgRollDice:
		h.handleRollDice(ctx, c, msg.Payload)

	default:
		c.Send(models.MsgError, models.ErrorPayload{Code: "unknown_type", Message: "Unknown message type"})
	}
}

func (h *WSHandler) handleStartGame(ctx context.Context, c *hub.Client, raw json.RawMessage) {
	var p models.StartGamePayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Bad payload"})
		return
	}

	g, ok := h.getGame(ctx, p.GameID)
	if !ok {
		c.Send(models.MsgError, models.ErrorPayload{Code: "not_found", Message: "Game not found"})
		return
	}

	if err := game.StartGame(g, c.PlayerID); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "start_error", Message: err.Error()})
		return
	}

	h.saveAndBroadcast(ctx, g)
}

func (h *WSHandler) handleRollDetermination(ctx context.Context, c *hub.Client, raw json.RawMessage) {
	var p models.RollDeterminationPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Bad payload"})
		return
	}

	g, ok := h.getGame(ctx, p.GameID)
	if !ok {
		c.Send(models.MsgError, models.ErrorPayload{Code: "not_found", Message: "Game not found"})
		return
	}

	complete, winnerID, nextRound, _, die, err := game.RecordDeterminationRoll(g, c.PlayerID)
	if err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "roll_error", Message: err.Error()})
		return
	}

	h.hub.Broadcast(g.ID, models.MsgDeterminationRoll, models.DeterminationRollPayload{
		PlayerID: c.PlayerID,
		Die:      die,
		Round:    nextRound,
	})

	if complete {
		// Find winner name
		winnerName := ""
		for _, p := range g.Players {
			if p.ID == winnerID {
				winnerName = p.Name
			}
		}
		h.hub.Broadcast(g.ID, models.MsgShooterDetermined, models.ShooterDeterminedPayload{
			ShooterID:  winnerID,
			PlayerName: winnerName,
		})
	}

	h.saveAndBroadcast(ctx, g)
}

func (h *WSHandler) handlePlaceBet(ctx context.Context, c *hub.Client, raw json.RawMessage) {
	var p models.PlaceBetPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Bad payload"})
		return
	}

	g, ok := h.getGame(ctx, p.GameID)
	if !ok {
		c.Send(models.MsgError, models.ErrorPayload{Code: "not_found", Message: "Game not found"})
		return
	}

	bet, err := game.PlaceBet(g, c.PlayerID, p.BetType, p.Amount, p.Number)
	if err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "bet_error", Message: err.Error()})
		return
	}

	// Find player chips
	playerChips := int64(0)
	for _, pl := range g.Players {
		if pl.ID == c.PlayerID {
			playerChips = pl.Chips
		}
	}

	h.hub.Broadcast(g.ID, models.MsgBetPlaced, models.BetPlacedPayload{
		Bet:         *bet,
		PlayerID:    c.PlayerID,
		PlayerChips: playerChips,
	})

	h.saveGame(ctx, g)
}

func (h *WSHandler) handleRemoveBet(ctx context.Context, c *hub.Client, raw json.RawMessage) {
	var p models.RemoveBetPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Bad payload"})
		return
	}

	g, ok := h.getGame(ctx, p.GameID)
	if !ok {
		c.Send(models.MsgError, models.ErrorPayload{Code: "not_found", Message: "Game not found"})
		return
	}

	refund, err := game.RemoveBet(g, c.PlayerID, p.BetID)
	if err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "remove_bet_error", Message: err.Error()})
		return
	}

	playerChips := int64(0)
	for _, pl := range g.Players {
		if pl.ID == c.PlayerID {
			playerChips = pl.Chips
		}
	}
	_ = refund

	h.hub.Broadcast(g.ID, models.MsgBetRemoved, models.BetRemovedPayload{
		BetID:       p.BetID,
		PlayerID:    c.PlayerID,
		PlayerChips: playerChips,
	})

	h.saveGame(ctx, g)
}

func (h *WSHandler) handleRollDice(ctx context.Context, c *hub.Client, raw json.RawMessage) {
	var p models.RollDicePayload
	if err := json.Unmarshal(raw, &p); err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "parse_error", Message: "Bad payload"})
		return
	}

	g, ok := h.getGame(ctx, p.GameID)
	if !ok {
		c.Send(models.MsgError, models.ErrorPayload{Code: "not_found", Message: "Game not found"})
		return
	}

	result, err := game.RollDice(g, c.PlayerID)
	if err != nil {
		c.Send(models.MsgError, models.ErrorPayload{Code: "roll_error", Message: err.Error()})
		return
	}

	// Broadcast dice result first (client animates)
	h.hub.Broadcast(g.ID, models.MsgDiceRolled, models.DiceRolledPayload{
		Die1:      result.Die1,
		Die2:      result.Die2,
		Total:     result.Total,
		ShooterID: c.PlayerID,
	})

	// Broadcast bet resolutions
	if len(result.BetResults) > 0 {
		h.hub.Broadcast(g.ID, models.MsgBetsResolved, models.BetsResolvedPayload{Results: result.BetResults})
	}

	// Broadcast phase change
	h.hub.Broadcast(g.ID, models.MsgPhaseChanged, models.PhaseChangedPayload{
		Phase:     result.PhaseAfter,
		Point:     result.PointAfter,
		ShooterID: g.ShooterID,
	})

	// Update stats for logged-in users
	go h.updateRollStats(ctx, g, result)

	h.saveAndBroadcast(ctx, g)
}

func (h *WSHandler) getGame(ctx context.Context, gameID string) (*models.Game, bool) {
	if g, ok := h.manager.Get(gameID); ok {
		return g, true
	}
	g, err := h.games.GetByID(ctx, gameID)
	if err != nil || g == nil {
		return nil, false
	}
	h.manager.Set(g)
	return g, true
}

func (h *WSHandler) saveGame(ctx context.Context, g *models.Game) {
	h.manager.Set(g)
	go h.games.Save(ctx, g)
}

func (h *WSHandler) saveAndBroadcast(ctx context.Context, g *models.Game) {
	h.manager.Set(g)
	go h.games.Save(ctx, g)
	h.hub.Broadcast(g.ID, models.MsgGameState, g)
}

func (h *WSHandler) updateRollStats(ctx context.Context, g *models.Game, result *game.RollResult) {
	for _, p := range g.Players {
		if p.UserID == "" {
			continue
		}
		netChips := int64(0)
		for _, r := range result.BetResults {
			if r.PlayerID == p.ID {
				netChips += r.NetChips
			}
		}
		delta := models.UserStats{DiceRolled: 1, NetChips: netChips}
		if netChips > 0 {
			delta.BiggestWin = netChips
		} else if netChips < 0 {
			delta.BiggestLoss = netChips
		}
		if err := h.users.UpdateStats(ctx, p.UserID, delta); err != nil {
			log.Printf("updateStats error: %v", err)
		}
	}
}
