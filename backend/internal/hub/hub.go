package hub

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Hub maintains WebSocket connections grouped by game ID.
type Hub struct {
	mu        sync.RWMutex
	games     map[string]map[*Client]bool // gameID → set of clients
	onMessage func(c *Client, raw []byte)
}

func New(onMessage func(c *Client, raw []byte)) *Hub {
	return &Hub{
		games:     make(map[string]map[*Client]bool),
		onMessage: onMessage,
	}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	if h.games[c.GameID] == nil {
		h.games[c.GameID] = make(map[*Client]bool)
	}
	h.games[c.GameID][c] = true
	h.mu.Unlock()
	log.Printf("hub: player %s joined game %s", c.PlayerID, c.GameID)
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if clients, ok := h.games[c.GameID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.games, c.GameID)
		}
	}
	h.mu.Unlock()
	log.Printf("hub: player %s left game %s", c.PlayerID, c.GameID)
}

// Broadcast sends a message to every client in a game.
func (h *Hub) Broadcast(gameID, msgType string, payload interface{}) {
	data, err := json.Marshal(map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	})
	if err != nil {
		log.Printf("hub broadcast marshal: %v", err)
		return
	}
	h.mu.RLock()
	clients := h.games[gameID]
	h.mu.RUnlock()
	for c := range clients {
		select {
		case c.send <- data:
		default:
			go func(cl *Client) {
				close(cl.send)
				h.Unregister(cl)
			}(c)
		}
	}
}

// ConnectedPlayerIDs returns the playerIDs currently connected in a game.
func (h *Hub) ConnectedPlayerIDs(gameID string) []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	var ids []string
	for c := range h.games[gameID] {
		ids = append(ids, c.PlayerID)
	}
	return ids
}

// NewClient creates and registers a new client, launching its pumps.
func (h *Hub) NewClient(conn *websocket.Conn, gameID, playerID, userID string) *Client {
	c := newClient(h, conn, gameID, playerID, userID)
	h.Register(c)
	go c.WritePump()
	go c.ReadPump(h.onMessage)
	return c
}
