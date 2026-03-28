package models

import "time"

type User struct {
	ID           string    `firestore:"id" json:"id"`
	Username     string    `firestore:"username" json:"username"`
	Email        string    `firestore:"email" json:"email"`
	PasswordHash string    `firestore:"password_hash" json:"-"`
	Stats        UserStats `firestore:"stats" json:"stats"`
	CreatedAt    time.Time `firestore:"created_at" json:"createdAt"`
}

type ChipDataPoint struct {
	T int64 `firestore:"t" json:"t"` // unix ms
	V int64 `firestore:"v" json:"v"` // cumulative net chips (cents)
}

type UserStats struct {
	GamesPlayed int              `firestore:"games_played" json:"gamesPlayed"`
	DiceRolled  int              `firestore:"dice_rolled" json:"diceRolled"`
	NetChips    int64            `firestore:"net_chips" json:"netChips"` // cents; positive=up, negative=down
	BiggestWin  int64            `firestore:"biggest_win" json:"biggestWin"`
	BiggestLoss int64            `firestore:"biggest_loss" json:"biggestLoss"`
	ChipHistory []ChipDataPoint  `firestore:"chip_history" json:"chipHistory"`
}
