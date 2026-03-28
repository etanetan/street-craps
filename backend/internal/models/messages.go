package models

// WSMessage is the envelope for all WebSocket messages.
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Client → Server message types
const (
	MsgJoinRoom          = "JOIN_ROOM"
	MsgRollDetermination = "ROLL_DETERMINATION"
	MsgPlaceBet          = "PLACE_BET"
	MsgRemoveBet         = "REMOVE_BET"
	MsgRollDice          = "ROLL_DICE"
	MsgStartGame         = "START_GAME"
	MsgTopUp             = "TOP_UP"
	MsgEndGame           = "END_GAME"
	MsgCancelEndGame     = "CANCEL_END_GAME"
	MsgApproveBet        = "APPROVE_BET"
	MsgRejectBet         = "REJECT_BET"
	MsgPing              = "PING"
)

// Server → Client message types
const (
	MsgGameState         = "GAME_STATE"
	MsgGameEnded         = "GAME_ENDED"
	MsgPlayerJoined      = "PLAYER_JOINED"
	MsgPlayerConnection  = "PLAYER_CONNECTION"
	MsgDeterminationRoll = "DETERMINATION_ROLL"
	MsgShooterDetermined = "SHOOTER_DETERMINED"
	MsgDiceRolled        = "DICE_ROLLED"
	MsgBetsResolved      = "BETS_RESOLVED"
	MsgPhaseChanged      = "PHASE_CHANGED"
	MsgBetPlaced         = "BET_PLACED"
	MsgBetRemoved        = "BET_REMOVED"
	MsgError             = "ERROR"
	MsgPong              = "PONG"
)

// Inbound payloads (client → server)

type JoinRoomPayload struct {
	GameID   string `json:"gameId"`
	PlayerID string `json:"playerId"`
	Token    string `json:"token"`
}

type PlaceBetPayload struct {
	GameID  string  `json:"gameId"`
	BetType BetType `json:"betType"`
	Amount  int64   `json:"amount"` // cents
	Number  int     `json:"number"` // for Place/Hardway/HighLow
}

type RemoveBetPayload struct {
	GameID string `json:"gameId"`
	BetID  string `json:"betId"`
}

type RollDicePayload struct {
	GameID string `json:"gameId"`
}

type StartGamePayload struct {
	GameID string `json:"gameId"`
}

type RollDeterminationPayload struct {
	GameID string `json:"gameId"`
}

// Outbound payloads (server → client)

type PlayerConnectionPayload struct {
	PlayerID  string `json:"playerId"`
	Connected bool   `json:"connected"`
}

type DeterminationRollPayload struct {
	PlayerID string `json:"playerId"`
	Die      int    `json:"die"`
	Round    int    `json:"round"`
}

type ShooterDeterminedPayload struct {
	ShooterID   string `json:"shooterId"`
	PlayerName  string `json:"playerName"`
}

type DiceRolledPayload struct {
	Die1      int    `json:"die1"`
	Die2      int    `json:"die2"`
	Total     int    `json:"total"`
	ShooterID string `json:"shooterId"`
}

type BetsResolvedPayload struct {
	Results []BetResult `json:"results"`
}

type PhaseChangedPayload struct {
	Phase     GamePhase `json:"phase"`
	Point     int       `json:"point,omitempty"`
	ShooterID string    `json:"shooterId,omitempty"`
}

type BetPlacedPayload struct {
	Bet          Bet    `json:"bet"`
	PlayerID     string `json:"playerId"`
	PlayerChips  int64  `json:"playerChips"`
}

type BetRemovedPayload struct {
	BetID       string `json:"betId"`
	PlayerID    string `json:"playerId"`
	PlayerChips int64  `json:"playerChips"`
}

type ApproveBetPayload struct {
	GameID    string `json:"gameId"`
	RequestID string `json:"requestId"`
}

type RejectBetPayload struct {
	GameID    string `json:"gameId"`
	RequestID string `json:"requestId"`
}

type TopUpPayload struct {
	GameID string `json:"gameId"`
	Amount int64  `json:"amount"` // cents
}

type EndGamePayload struct {
	GameID string `json:"gameId"`
}

type CancelEndGamePayload struct {
	GameID string `json:"gameId"`
}

type GameEndedPayload struct {
	GameID string `json:"gameId"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
