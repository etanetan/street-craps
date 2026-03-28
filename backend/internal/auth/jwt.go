package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	IsGuest  bool   `json:"isGuest"`
	GameID   string `json:"gameId,omitempty"`   // guest-only: scoped to game
	PlayerID string `json:"playerId,omitempty"` // player session identity
	jwt.RegisteredClaims
}

type Service struct {
	accessSecret  []byte
	refreshSecret []byte
}

func NewService(accessSecret, refreshSecret string) *Service {
	return &Service{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
	}
}

func (s *Service) SignAccess(userID, username string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.accessSecret)
}

func (s *Service) SignRefresh(userID string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.refreshSecret)
}

// SignPlayerToken creates a game-scoped token for reconnect identity.
func (s *Service) SignPlayerToken(playerID, gameID, userID, username string, isGuest bool) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		IsGuest:  isGuest,
		GameID:   gameID,
		PlayerID: playerID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(48 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.accessSecret)
}

func (s *Service) VerifyAccess(tokenStr string) (*Claims, error) {
	return s.verify(tokenStr, s.accessSecret)
}

func (s *Service) VerifyRefresh(tokenStr string) (*Claims, error) {
	return s.verify(tokenStr, s.refreshSecret)
}

func (s *Service) verify(tokenStr string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
