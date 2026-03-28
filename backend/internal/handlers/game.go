package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/etanetan/street-craps/backend/internal/auth"
	"github.com/etanetan/street-craps/backend/internal/game"
	"github.com/etanetan/street-craps/backend/internal/hub"
	"github.com/etanetan/street-craps/backend/internal/models"
	"github.com/etanetan/street-craps/backend/internal/repository"
	"github.com/google/uuid"
)

type GameHandler struct {
	games   *repository.GameRepo
	users   *repository.UserRepo
	manager *game.Manager
	jwt     *auth.Service
	hub     *hub.Hub
}

func NewGameHandler(games *repository.GameRepo, users *repository.UserRepo, manager *game.Manager, jwt *auth.Service, h *hub.Hub) *GameHandler {
	return &GameHandler{games: games, users: users, manager: manager, jwt: jwt, hub: h}
}

type createGameRequest struct {
	DiceTheme string `json:"diceTheme"`
}

type createGameResponse struct {
	GameID   string `json:"gameId"`
	Code     string `json:"code"`
	PlayerID string `json:"playerId"`
	Token    string `json:"playerToken"`
}

type joinGameRequest struct {
	Name      string `json:"name"`
	BuyIn     int64  `json:"buyIn"` // cents
	DiceTheme string `json:"diceTheme"`
}

type joinGameResponse struct {
	PlayerID string      `json:"playerId"`
	Token    string      `json:"playerToken"`
	Game     models.Game `json:"game"`
}

// POST /api/games
// Creates an empty game. The host must then call /join to add themselves.
func (h *GameHandler) CreateGame(w http.ResponseWriter, r *http.Request) {
	var req createGameRequest
	json.NewDecoder(r.Body).Decode(&req)

	g := &models.Game{
		ID:        uuid.New().String(),
		Code:      generateCode(),
		Phase:     models.PhaseWaiting,
		Players:   []models.Player{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	h.manager.Set(g)
	if err := h.games.Save(r.Context(), g); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to save game")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"gameId": g.ID,
		"code":   g.Code,
	})
}

// GET /api/games/{code}
func (h *GameHandler) GetGame(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimPrefix(r.URL.Path, "/api/games/")
	if code == "" {
		writeError(w, http.StatusBadRequest, "missing_code", "Game code required")
		return
	}

	g, ok := h.findGame(r, code)
	if !ok || g == nil {
		writeError(w, http.StatusNotFound, "not_found", "Game not found")
		return
	}

	writeJSON(w, http.StatusOK, g)
}

// POST /api/games/{gameId}/join
func (h *GameHandler) JoinGame(w http.ResponseWriter, r *http.Request) {
	// Extract gameId from path: /api/games/{gameId}/join
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/games/"), "/")
	if len(parts) < 2 || parts[1] != "join" {
		writeError(w, http.StatusBadRequest, "bad_path", "Invalid path")
		return
	}
	gameID := parts[0]

	var req joinGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "missing_name", "Name is required")
		return
	}
	if req.BuyIn <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_buyin", "Buy-in must be positive")
		return
	}
	if req.DiceTheme == "" {
		req.DiceTheme = "classic"
	}

	claims, _ := auth.ClaimsFrom(r.Context())
	userID := ""
	if claims != nil {
		userID = claims.UserID
	}

	// Load game
	g, ok := h.manager.Get(gameID)
	if !ok {
		var err error
		g, err = h.games.GetByID(r.Context(), gameID)
		if err != nil || g == nil {
			writeError(w, http.StatusNotFound, "not_found", "Game not found")
			return
		}
		h.manager.Set(g)
	}

	playerID := uuid.New().String()
	seatOrder := len(g.Players)
	// First player to join becomes host
	if g.HostID == "" {
		g.HostID = playerID
	}
	if err := game.AddPlayer(g, playerID, userID, req.Name, req.BuyIn, req.DiceTheme, seatOrder); err != nil {
		writeError(w, http.StatusBadRequest, "join_error", err.Error())
		return
	}

	h.manager.Set(g)
	if err := h.games.Save(r.Context(), g); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to save")
		return
	}

	// Notify already-connected players that someone new joined
	if h.hub != nil {
		h.hub.Broadcast(g.ID, models.MsgGameState, g)
	}

	token, _ := h.jwt.SignPlayerToken(playerID, g.ID, userID, req.Name, claims == nil)
	writeJSON(w, http.StatusOK, joinGameResponse{
		PlayerID: playerID,
		Token:    token,
		Game:     *g,
	})
}

// GET /api/users/{userId}/stats
func (h *GameHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimPrefix(r.URL.Path, "/api/users/")
	userID = strings.TrimSuffix(userID, "/stats")

	claims, ok := auth.ClaimsFrom(r.Context())
	if !ok || claims.UserID != userID {
		writeError(w, http.StatusForbidden, "forbidden", "Cannot view other users' stats")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"userId":   user.ID,
		"username": user.Username,
		"stats":    user.Stats,
	})
}

// findGame loads a game by code or ID from memory or Firestore.
func (h *GameHandler) findGame(r *http.Request, codeOrID string) (*models.Game, bool) {
	if g, ok := h.manager.Get(codeOrID); ok {
		return g, true
	}
	// Try by code
	g, err := h.games.GetByCode(r.Context(), codeOrID)
	if err == nil && g != nil {
		h.manager.Set(g)
		return g, true
	}
	// Try by ID
	g, err = h.games.GetByID(r.Context(), codeOrID)
	if err == nil && g != nil {
		h.manager.Set(g)
		return g, true
	}
	return nil, false
}

// generateCode creates a random 6-character uppercase alphanumeric code.
func generateCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rng.Intn(len(chars))]
	}
	return string(b)
}

// SetPlayerBuyIn updates the host's buy-in (called when host "joins" their own game).
func SetPlayerBuyIn(g *models.Game, playerID string, buyIn int64) error {
	for i, p := range g.Players {
		if p.ID == playerID {
			g.Players[i].BuyIn = buyIn
			g.Players[i].Chips = buyIn
			return nil
		}
	}
	return fmt.Errorf("player not found")
}
