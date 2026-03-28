package models

import "time"

type GamePhase string

const (
	PhaseWaiting              GamePhase = "WAITING"
	PhaseShooterDetermination GamePhase = "SHOOTER_DETERMINATION"
	PhaseComeOut              GamePhase = "COME_OUT"
	PhasePoint                GamePhase = "POINT_PHASE"
	PhaseRoundOver            GamePhase = "ROUND_OVER"
)

type BetType string

const (
	BetPassLine  BetType = "PASS_LINE"
	BetDontPass  BetType = "DONT_PASS"
	BetPlace     BetType = "PLACE"
	BetLayPlace  BetType = "LAY_PLACE" // auto-matched lay for non-shooter opposing a Place bet
)

type BetOutcome string

const (
	BetWin  BetOutcome = "WIN"
	BetLose BetOutcome = "LOSE"
	BetPush BetOutcome = "PUSH"
)

// Bet represents a single wager. Amount is in cents (integer) to avoid float rounding.
type Bet struct {
	ID       string  `firestore:"id" json:"id"`
	PlayerID string  `firestore:"player_id" json:"playerId"`
	Type     BetType `firestore:"type" json:"type"`
	Amount   int64   `firestore:"amount" json:"amount"` // cents
	Number   int     `firestore:"number" json:"number"` // for Place, Hardway, HighLow
	Active   bool    `firestore:"active" json:"active"`
}

type DiceRoll struct {
	Die1      int       `firestore:"die1" json:"die1"`
	Die2      int       `firestore:"die2" json:"die2"`
	Total     int       `firestore:"total" json:"total"`
	RolledBy  string    `firestore:"rolled_by" json:"rolledBy"`
	Phase     GamePhase `firestore:"phase" json:"phase"`
	Timestamp time.Time `firestore:"timestamp" json:"timestamp"`
}

type ShooterRoll struct {
	PlayerID string `firestore:"player_id" json:"playerId"`
	Die      int    `firestore:"die" json:"die"`
	Round    int    `firestore:"round" json:"round"`
}

type Player struct {
	ID          string `firestore:"id" json:"id"`
	UserID      string `firestore:"user_id" json:"userId"` // empty for guests
	Name        string `firestore:"name" json:"name"`
	Chips       int64  `firestore:"chips" json:"chips"`   // cents
	BuyIn       int64  `firestore:"buy_in" json:"buyIn"` // cents
	IsShooter   bool   `firestore:"is_shooter" json:"isShooter"`
	IsConnected bool   `firestore:"is_connected" json:"isConnected"`
	SeatOrder   int    `firestore:"seat_order" json:"seatOrder"`
	DiceTheme     string `firestore:"dice_theme" json:"diceTheme"`
	DiceAnimStyle string `firestore:"dice_anim_style" json:"diceAnimStyle"`
	Bets        []Bet  `firestore:"bets" json:"bets"`
}

type Game struct {
	ID                   string        `firestore:"id" json:"id"`
	Code                 string        `firestore:"code" json:"code"` // 6-char shareable
	Phase                GamePhase     `firestore:"phase" json:"phase"`
	Point                int           `firestore:"point" json:"point"` // 0 if no point
	ShooterID            string        `firestore:"shooter_id" json:"shooterId"`
	HostID               string        `firestore:"host_id" json:"hostId"`
	Players              []Player      `firestore:"players" json:"players"`
	RollHistory          []DiceRoll    `firestore:"roll_history" json:"rollHistory"`
	ShooterDetermination []ShooterRoll `firestore:"shooter_determination" json:"shooterDetermination"`
	DetermineRound       int           `firestore:"determine_round" json:"determineRound"`
	EndGameVotes         []string      `firestore:"end_game_votes" json:"endGameVotes"` // player IDs who voted to end
	CreatedAt            time.Time     `firestore:"created_at" json:"createdAt"`
	UpdatedAt            time.Time     `firestore:"updated_at" json:"updatedAt"`
}

type BetResult struct {
	BetID    string     `json:"betId"`
	PlayerID string     `json:"playerId"`
	Outcome  BetOutcome `json:"outcome"`
	Amount   int64      `json:"amount"`   // original bet
	NetChips int64      `json:"netChips"` // change to chip count (positive=win, negative=lose)
}
