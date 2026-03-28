package game

import (
	"github.com/etanetan/street-craps/backend/internal/models"
)

// ResolveComeOut resolves all active bets after a come-out roll.
// Place/LayPlace bets are active even during come-out (they persist from point phase).
func ResolveComeOut(bets []models.Bet, die1, die2 int) []models.BetResult {
	total := die1 + die2
	result := EvalComeOut(total)
	var out []models.BetResult

	for _, b := range bets {
		if !b.Active {
			continue
		}
		var res models.BetResult
		res.BetID = b.ID
		res.PlayerID = b.PlayerID
		res.Amount = b.Amount

		switch b.Type {
		case models.BetPassLine:
			switch result {
			case ComeOutNatural:
				res.Outcome = models.BetWin
				res.NetChips = b.Amount // 1:1
			case ComeOutCraps:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			default:
				continue // point set, bet stays
			}
		case models.BetDontPass:
			switch result {
			case ComeOutNatural:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			case ComeOutCraps:
				if total == 12 {
					res.Outcome = models.BetPush
					res.NetChips = 0
				} else {
					res.Outcome = models.BetWin
					res.NetChips = b.Amount
				}
			default:
				continue // point set, bet stays
			}

		// Place/LayPlace bets persist through come-out — only 7 or the number resolves them.
		case models.BetPlace:
			if total == 7 {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else if total == b.Number {
				num, den := PlacePayout(b.Number)
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * num / den
			} else {
				continue
			}
		case models.BetLayPlace:
			if total == 7 {
				res.Outcome = models.BetWin
				res.NetChips = LayPlaceWin(b.Amount, b.Number)
			} else if total == b.Number {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else {
				continue
			}

		default:
			continue
		}
		out = append(out, res)
	}
	return out
}

// ResolvePointPhase resolves bets after a point-phase roll.
func ResolvePointPhase(bets []models.Bet, die1, die2, point int) []models.BetResult {
	total := die1 + die2
	phaseResult := EvalPointPhase(total, point)
	var out []models.BetResult

	for _, b := range bets {
		if !b.Active {
			continue
		}
		var res models.BetResult
		res.BetID = b.ID
		res.PlayerID = b.PlayerID
		res.Amount = b.Amount

		switch b.Type {
		case models.BetPassLine:
			switch phaseResult {
			case PointPhasePointHit:
				res.Outcome = models.BetWin
				res.NetChips = b.Amount
			case PointPhaseSevenOut:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			default:
				continue
			}
		case models.BetDontPass:
			switch phaseResult {
			case PointPhasePointHit:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			case PointPhaseSevenOut:
				res.Outcome = models.BetWin
				res.NetChips = b.Amount
			default:
				continue
			}
		case models.BetPlace:
			if total == 7 {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else if total == b.Number {
				num, den := PlacePayout(b.Number)
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * num / den
			} else {
				continue
			}
		case models.BetLayPlace:
			if total == 7 {
				res.Outcome = models.BetWin
				res.NetChips = LayPlaceWin(b.Amount, b.Number)
			} else if total == b.Number {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else {
				continue
			}
		default:
			continue
		}
		out = append(out, res)
	}
	return out
}

// IsPassPhaseBet returns true for bets only allowed to be placed in point phase.
func IsPassPhaseBet(t models.BetType) bool {
	return t == models.BetPlace
}
