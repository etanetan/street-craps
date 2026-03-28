package game

import (
	"crypto/rand"
	"errors"
	"math/big"
	"time"

	"github.com/etanetan/street-craps/backend/internal/models"
	"github.com/google/uuid"
)

// rollDie returns a cryptographically random die value 1–6.
func rollDie() int {
	n, err := rand.Int(rand.Reader, big.NewInt(6))
	if err != nil {
		panic(err)
	}
	return int(n.Int64()) + 1
}

// RollResult is the output of processing a dice roll.
type RollResult struct {
	Die1        int
	Die2        int
	Total       int
	BetResults  []models.BetResult
	PhaseAfter  models.GamePhase
	PointAfter  int
	NewShooterID string
	SevenOut    bool
}

// --- State transition functions (pure: take game, return new game + events) ---

// AddPlayer adds a player to a WAITING game.
func AddPlayer(g *models.Game, playerID, userID, name string, buyIn int64, diceTheme, diceAnimStyle string, seatOrder int) error {
	if g.Phase != models.PhaseWaiting {
		return errors.New("game is not in waiting phase")
	}
	for _, p := range g.Players {
		if p.ID == playerID {
			return errors.New("player already in game")
		}
	}
	g.Players = append(g.Players, models.Player{
		ID:          playerID,
		UserID:      userID,
		Name:        name,
		Chips:       buyIn,
		BuyIn:       buyIn,
		IsConnected: true,
		SeatOrder:   seatOrder,
		DiceTheme:     diceTheme,
		DiceAnimStyle: diceAnimStyle,
		Bets:        []models.Bet{},
	})
	return nil
}

// StartGame transitions from WAITING to SHOOTER_DETERMINATION.
func StartGame(g *models.Game, callerID string) error {
	if g.HostID != callerID {
		return errors.New("only the host can start the game")
	}
	if g.Phase != models.PhaseWaiting {
		return errors.New("game already started")
	}
	if len(g.Players) < 2 {
		return errors.New("need at least 2 players")
	}
	g.Phase = models.PhaseShooterDetermination
	g.DetermineRound = 1
	return nil
}

// RecordDeterminationRoll records a player's roll during shooter determination.
// Returns (isComplete, winnerID, nextRound, tiedPlayers, die).
func RecordDeterminationRoll(g *models.Game, playerID string) (complete bool, winnerID string, nextRound int, tiedPlayers []string, die int, err error) {
	if g.Phase != models.PhaseShooterDetermination {
		return false, "", 0, nil, 0, errors.New("not in shooter determination phase")
	}
	// Check player exists
	playerExists := false
	for _, p := range g.Players {
		if p.ID == playerID {
			playerExists = true
			break
		}
	}
	if !playerExists {
		return false, "", 0, nil, 0, errors.New("player not in game")
	}
	// Check hasn't rolled this round
	for _, r := range g.ShooterDetermination {
		if r.PlayerID == playerID && r.Round == g.DetermineRound {
			return false, "", 0, nil, 0, errors.New("already rolled this round")
		}
	}

	die = rollDie()
	g.ShooterDetermination = append(g.ShooterDetermination, models.ShooterRoll{
		PlayerID: playerID,
		Die:      die,
		Round:    g.DetermineRound,
	})

	// Check if all players rolled
	activePlayers := g.Players
	if !AllPlayersRolled(activePlayers, g.ShooterDetermination, g.DetermineRound) {
		return false, "", g.DetermineRound, nil, die, nil
	}

	// Resolve winner
	winner, nr, tied := FindWinner(activePlayers, g.ShooterDetermination, g.DetermineRound)
	if winner != "" {
		g.ShooterID = winner
		g.Phase = models.PhaseComeOut
		setShooter(g, winner)
		return true, winner, g.DetermineRound, nil, die, nil
	}
	// Tie: advance to next round
	g.DetermineRound = nr
	return false, "", nr, tied, die, nil
}

// PlaceBet places a bet for a player. Validates chips and phase.
func PlaceBet(g *models.Game, playerID string, betType models.BetType, amount int64, number int) (*models.Bet, error) {
	if g.Phase != models.PhaseComeOut && g.Phase != models.PhasePoint {
		return nil, errors.New("betting not allowed in current phase")
	}
	if IsPassPhaseBet(betType) && g.Phase != models.PhasePoint {
		return nil, errors.New("that bet is only available after point is set")
	}
	// Shooter cannot bet against themselves on come-out
	if betType == models.BetDontPass && playerID == g.ShooterID {
		return nil, errors.New("shooter must bet Pass Line, not Don't Pass")
	}
	if amount <= 0 {
		return nil, errors.New("bet amount must be positive")
	}

	pidx := playerIndex(g, playerID)
	if pidx < 0 {
		return nil, errors.New("player not in game")
	}
	if g.Players[pidx].Chips < amount {
		return nil, errors.New("insufficient chips")
	}

	bet := models.Bet{
		ID:       uuid.New().String(),
		PlayerID: playerID,
		Type:     betType,
		Amount:   amount,
		Number:   number,
		Active:   true,
	}
	g.Players[pidx].Chips -= amount
	g.Players[pidx].Bets = append(g.Players[pidx].Bets, bet)
	return &bet, nil
}

// AutoMatchBets places a matching Don't Pass bet for each non-shooter when
// the shooter places a Pass Line bet during the come-out phase.
func AutoMatchBets(g *models.Game, shooterBet *models.Bet) []models.Bet {
	if shooterBet.Type != models.BetPassLine || g.ShooterID != shooterBet.PlayerID {
		return nil
	}
	if g.Phase != models.PhaseComeOut {
		return nil
	}
	var placed []models.Bet
	for i := range g.Players {
		p := &g.Players[i]
		if p.ID == shooterBet.PlayerID {
			continue
		}
		// Skip if already has an active Don't Pass bet
		for _, b := range p.Bets {
			if b.Type == models.BetDontPass && b.Active {
				goto nextPlayer
			}
		}
		{
			if p.Chips <= 0 {
				goto nextPlayer
			}
			if p.Chips < shooterBet.Amount {
				// Fader can't fully cover: request approval instead of partial auto-match
				g.PendingBetRequests = append(g.PendingBetRequests, models.PendingBetRequest{
					ID:              uuid.New().String(),
					ShooterBetID:    shooterBet.ID,
					ShooterPlayerID: shooterBet.PlayerID,
					BetType:         models.BetPassLine,
					Amount:          shooterBet.Amount,
					FaderPlayerID:   p.ID,
					FaderCanCover:   p.Chips,
				})
				goto nextPlayer
			}
			bet := models.Bet{
				ID:       uuid.New().String(),
				PlayerID: p.ID,
				Type:     models.BetDontPass,
				Amount:   shooterBet.Amount,
				Active:   true,
			}
			p.Chips -= shooterBet.Amount
			p.Bets = append(p.Bets, bet)
			placed = append(placed, bet)
		}
	nextPlayer:
	}
	return placed
}

// AutoMatchPlaceBet places a matching LayPlace bet for each non-shooter when
// the shooter places a Place bet. The lay amount = bet * payoutNum / payoutDen.
func AutoMatchPlaceBet(g *models.Game, shooterBet *models.Bet) []models.Bet {
	if shooterBet.Type != models.BetPlace || g.ShooterID != shooterBet.PlayerID {
		return nil
	}

	num, den := PlacePayout(shooterBet.Number)
	layAmount := shooterBet.Amount * num / den
	if layAmount <= 0 {
		return nil
	}

	var placed []models.Bet
	for i := range g.Players {
		p := &g.Players[i]
		if p.ID == shooterBet.PlayerID {
			continue
		}
		// Skip if already has an active LayPlace bet for this number
		alreadyHas := false
		for _, b := range p.Bets {
			if b.Type == models.BetLayPlace && b.Number == shooterBet.Number && b.Active {
				alreadyHas = true
				break
			}
		}
		if alreadyHas {
			continue
		}
		if p.Chips <= 0 {
			continue
		}
		if p.Chips < layAmount {
			// Fader can't fully cover: request approval instead of partial auto-match
			g.PendingBetRequests = append(g.PendingBetRequests, models.PendingBetRequest{
				ID:              uuid.New().String(),
				ShooterBetID:    shooterBet.ID,
				ShooterPlayerID: shooterBet.PlayerID,
				BetType:         models.BetPlace,
				Amount:          shooterBet.Amount,
				Number:          shooterBet.Number,
				FaderPlayerID:   p.ID,
				FaderCanCover:   p.Chips,
			})
			continue
		}
		bet := models.Bet{
			ID:       uuid.New().String(),
			PlayerID: p.ID,
			Type:     models.BetLayPlace,
			Amount:   layAmount,
			Number:   shooterBet.Number,
			Active:   true,
		}
		p.Chips -= layAmount
		p.Bets = append(p.Bets, bet)
		placed = append(placed, bet)
	}
	return placed
}

// ApproveBetRequest accepts a pending bet request: creates the fader's counter-bet
// using their current chips (capped at the required lay amount) and removes the request.
// This uses current chip count, not the stale FaderCanCover snapshot, so a top-up
// that happened after the request was created is reflected correctly.
func ApproveBetRequest(g *models.Game, faderPlayerID, requestID string) (*models.Bet, error) {
	reqIdx := -1
	for i, r := range g.PendingBetRequests {
		if r.ID == requestID && r.FaderPlayerID == faderPlayerID {
			reqIdx = i
			break
		}
	}
	if reqIdx < 0 {
		return nil, errors.New("bet request not found")
	}
	req := g.PendingBetRequests[reqIdx]
	g.PendingBetRequests = append(g.PendingBetRequests[:reqIdx], g.PendingBetRequests[reqIdx+1:]...)

	fidx := playerIndex(g, faderPlayerID)
	if fidx < 0 {
		return nil, errors.New("fader not found")
	}

	// Compute the required lay amount from current bet parameters
	required := req.Amount // DONT_PASS matches 1:1
	if req.BetType == models.BetPlace {
		num, den := PlacePayout(req.Number)
		required = req.Amount * num / den
	}

	// Cover as much as fader can, up to the required amount
	amt := g.Players[fidx].Chips
	if amt > required {
		amt = required
	}
	if amt <= 0 {
		return nil, errors.New("fader has no chips to cover")
	}

	faderBetType := models.BetDontPass
	if req.BetType == models.BetPlace {
		faderBetType = models.BetLayPlace
	}

	bet := models.Bet{
		ID:       uuid.New().String(),
		PlayerID: faderPlayerID,
		Type:     faderBetType,
		Amount:   amt,
		Number:   req.Number,
		Active:   true,
	}
	g.Players[fidx].Chips -= amt
	g.Players[fidx].Bets = append(g.Players[fidx].Bets, bet)
	return &bet, nil
}

// RejectBetRequest denies a pending bet request: removes the shooter's original bet,
// refunds their chips, and removes the request.
func RejectBetRequest(g *models.Game, faderPlayerID, requestID string) (shooterPlayerID string, shooterBetID string, refund int64, err error) {
	reqIdx := -1
	for i, r := range g.PendingBetRequests {
		if r.ID == requestID && r.FaderPlayerID == faderPlayerID {
			reqIdx = i
			break
		}
	}
	if reqIdx < 0 {
		return "", "", 0, errors.New("bet request not found")
	}
	req := g.PendingBetRequests[reqIdx]
	g.PendingBetRequests = append(g.PendingBetRequests[:reqIdx], g.PendingBetRequests[reqIdx+1:]...)

	sidx := playerIndex(g, req.ShooterPlayerID)
	if sidx < 0 {
		return req.ShooterPlayerID, req.ShooterBetID, 0, errors.New("shooter not found")
	}
	for i, b := range g.Players[sidx].Bets {
		if b.ID == req.ShooterBetID {
			g.Players[sidx].Chips += b.Amount
			g.Players[sidx].Bets = append(g.Players[sidx].Bets[:i], g.Players[sidx].Bets[i+1:]...)
			return req.ShooterPlayerID, req.ShooterBetID, b.Amount, nil
		}
	}
	return req.ShooterPlayerID, req.ShooterBetID, 0, errors.New("shooter's bet not found")
}

// RemoveBet removes a bet before the roll.
func RemoveBet(g *models.Game, playerID, betID string) (int64, error) {
	pidx := playerIndex(g, playerID)
	if pidx < 0 {
		return 0, errors.New("player not in game")
	}
	bets := g.Players[pidx].Bets
	for i, b := range bets {
		if b.ID == betID && b.Active {
			// Return chips
			g.Players[pidx].Chips += b.Amount
			g.Players[pidx].Bets = append(bets[:i], bets[i+1:]...)
			return b.Amount, nil
		}
	}
	return 0, errors.New("bet not found")
}

// RollDice processes a dice roll by the shooter.
// Returns RollResult with bet outcomes and phase transition.
func RollDice(g *models.Game, callerID string) (*RollResult, error) {
	if g.ShooterID != callerID {
		return nil, errors.New("only the shooter can roll")
	}
	if g.Phase != models.PhaseComeOut && g.Phase != models.PhasePoint {
		return nil, errors.New("cannot roll in current phase")
	}
	if len(g.PendingBetRequests) > 0 {
		return nil, errors.New("waiting for bet approval before rolling")
	}

	die1, die2 := rollDie(), rollDie()
	total := die1 + die2

	g.RollHistory = append(g.RollHistory, models.DiceRoll{
		Die1:      die1,
		Die2:      die2,
		Total:     total,
		RolledBy:  callerID,
		Phase:     g.Phase,
		Timestamp: time.Now(),
	})

	res := &RollResult{Die1: die1, Die2: die2, Total: total}

	// Collect all active bets across players
	allBets := collectAllBets(g)

	if g.Phase == models.PhaseComeOut {
		res.BetResults = ResolveComeOut(allBets, die1, die2)
		result := EvalComeOut(total)
		switch result {
		case ComeOutNatural:
			applyResults(g, res.BetResults)
			clearResolvedBets(g, res.BetResults)
			res.PhaseAfter = models.PhaseComeOut
			res.PointAfter = 0
		case ComeOutCraps:
			applyResults(g, res.BetResults)
			clearResolvedBets(g, res.BetResults)
			res.PhaseAfter = models.PhaseComeOut
			res.PointAfter = 0
		case ComeOutPoint:
			applyResults(g, res.BetResults)
			clearResolvedBets(g, res.BetResults)
			g.Point = total
			g.Phase = models.PhasePoint
			res.PhaseAfter = models.PhasePoint
			res.PointAfter = total
		}
	} else {
		// PhasePoint
		res.BetResults = ResolvePointPhase(allBets, die1, die2, g.Point)
		phaseResult := EvalPointPhase(total, g.Point)
		applyResults(g, res.BetResults)
		clearResolvedBets(g, res.BetResults)
		switch phaseResult {
		case PointPhasePointHit:
			g.Point = 0
			g.Phase = models.PhaseComeOut
			res.PhaseAfter = models.PhaseComeOut
		case PointPhaseSevenOut:
			res.SevenOut = true
			g.Point = 0
			g.Phase = models.PhaseComeOut
			newShooter := NextShooter(g.Players, callerID)
			g.ShooterID = newShooter
			setShooter(g, newShooter)
			res.NewShooterID = newShooter
			res.PhaseAfter = models.PhaseComeOut
		default:
			res.PhaseAfter = models.PhasePoint
			res.PointAfter = g.Point
		}
	}

	return res, nil
}

// --- helpers ---

func playerIndex(g *models.Game, playerID string) int {
	for i, p := range g.Players {
		if p.ID == playerID {
			return i
		}
	}
	return -1
}

func setShooter(g *models.Game, shooterID string) {
	for i := range g.Players {
		g.Players[i].IsShooter = g.Players[i].ID == shooterID
	}
}

func collectAllBets(g *models.Game) []models.Bet {
	var all []models.Bet
	for _, p := range g.Players {
		all = append(all, p.Bets...)
	}
	return all
}

func applyResults(g *models.Game, results []models.BetResult) {
	for _, r := range results {
		pidx := playerIndex(g, r.PlayerID)
		if pidx < 0 {
			continue
		}
		if r.Outcome == models.BetPush {
			// return bet
			g.Players[pidx].Chips += r.Amount
		} else if r.Outcome == models.BetWin {
			// return bet + winnings
			g.Players[pidx].Chips += r.Amount + r.NetChips
		}
		// Lose: chips already deducted when bet was placed
	}
}

func clearResolvedBets(g *models.Game, results []models.BetResult) {
	resolved := map[string]bool{}
	for _, r := range results {
		resolved[r.BetID] = true
	}
	for pidx := range g.Players {
		var remaining []models.Bet
		for _, b := range g.Players[pidx].Bets {
			if !resolved[b.ID] {
				remaining = append(remaining, b)
			}
		}
		g.Players[pidx].Bets = remaining
	}
}
