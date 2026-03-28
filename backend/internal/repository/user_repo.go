package repository

import (
	"context"
	"errors"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/etanetan/street-craps/backend/internal/models"
	"github.com/google/uuid"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const usersCollection = "users"

type UserRepo struct {
	db *firestore.Client
}

func NewUserRepo(db *firestore.Client) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, username, email, passwordHash string) (*models.User, error) {
	u := &models.User{
		ID:           uuid.New().String(),
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    time.Now(),
	}
	_, err := r.db.Collection(usersCollection).Doc(u.ID).Set(ctx, u)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	doc, err := r.db.Collection(usersCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, nil
		}
		return nil, err
	}
	var u models.User
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	iter := r.db.Collection(usersCollection).Where("username", "==", username).Limit(1).Documents(ctx)
	defer iter.Stop()
	doc, err := iter.Next()
	if errors.Is(err, iterator.Done) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var u models.User
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	iter := r.db.Collection(usersCollection).Where("email", "==", email).Limit(1).Documents(ctx)
	defer iter.Stop()
	doc, err := iter.Next()
	if errors.Is(err, iterator.Done) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var u models.User
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) UpdateStats(ctx context.Context, userID string, delta models.UserStats) error {
	ref := r.db.Collection(usersCollection).Doc(userID)
	return r.db.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil {
			return err
		}
		var u models.User
		if err := doc.DataTo(&u); err != nil {
			return err
		}
		u.Stats.GamesPlayed += delta.GamesPlayed
		u.Stats.DiceRolled += delta.DiceRolled
		u.Stats.NetChips += delta.NetChips
		if delta.BiggestWin > u.Stats.BiggestWin {
			u.Stats.BiggestWin = delta.BiggestWin
		}
		if delta.BiggestLoss < u.Stats.BiggestLoss {
			u.Stats.BiggestLoss = delta.BiggestLoss
		}
		return tx.Set(ref, u)
	})
}
