package game

import (
	"sync"

	"github.com/etanetan/street-craps/backend/internal/models"
)

// Manager holds an in-memory cache of active games.
// Firestore is the source of truth; this speeds up reads.
type Manager struct {
	mu    sync.RWMutex
	games map[string]*models.Game // keyed by game ID
}

func NewManager() *Manager {
	return &Manager{games: make(map[string]*models.Game)}
}

func (m *Manager) Set(g *models.Game) {
	m.mu.Lock()
	m.games[g.ID] = g
	m.mu.Unlock()
}

func (m *Manager) Get(id string) (*models.Game, bool) {
	m.mu.RLock()
	g, ok := m.games[id]
	m.mu.RUnlock()
	return g, ok
}

func (m *Manager) Delete(id string) {
	m.mu.Lock()
	delete(m.games, id)
	m.mu.Unlock()
}
