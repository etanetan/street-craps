package repository

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/etanetan/street-craps/backend/internal/models"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const gamesCollection = "games"

type GameRepo struct {
	db *firestore.Client
}

func NewGameRepo(db *firestore.Client) *GameRepo {
	return &GameRepo{db: db}
}

func (r *GameRepo) Save(ctx context.Context, g *models.Game) error {
	g.UpdatedAt = time.Now()
	_, err := r.db.Collection(gamesCollection).Doc(g.ID).Set(ctx, g)
	return err
}

func (r *GameRepo) GetByID(ctx context.Context, id string) (*models.Game, error) {
	doc, err := r.db.Collection(gamesCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var g models.Game
	if err := doc.DataTo(&g); err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *GameRepo) GetByCode(ctx context.Context, code string) (*models.Game, error) {
	iter := r.db.Collection(gamesCollection).Where("code", "==", code).Limit(1).Documents(ctx)
	defer iter.Stop()
	doc, err := iter.Next()
	if err != nil {
		return nil, nil
	}
	var g models.Game
	if err := doc.DataTo(&g); err != nil {
		return nil, err
	}
	return &g, nil
}

// UpdatePlayer updates a single player document within a game using a transaction.
func (r *GameRepo) UpdateGame(ctx context.Context, gameID string, update func(*models.Game) error) (*models.Game, error) {
	ref := r.db.Collection(gamesCollection).Doc(gameID)
	var updated *models.Game
	err := r.db.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var g models.Game
		if err := doc.DataTo(&g); err != nil {
			return err
		}
		if err := update(&g); err != nil {
			return err
		}
		g.UpdatedAt = time.Now()
		updated = &g
		return tx.Set(ref, g)
	})
	return updated, err
}
