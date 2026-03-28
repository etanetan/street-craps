package game

import (
	"github.com/etanetan/street-craps/backend/internal/models"
)

// ResolveComeOut resolves all active bets after a come-out roll.
// Returns a slice of BetResult for every active bet.
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
		case models.BetAnyCraps:
			if total == 2 || total == 3 || total == 12 {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * 7
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		case models.BetAnySeven:
			if total == 7 {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * 4
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		case models.BetHighLow:
			if total == 7 {
				res.Outcome = models.BetPush
				res.NetChips = 0
			} else if (b.Number == 1 && IsHigh(total)) || (b.Number == 0 && IsLow(total)) {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		default:
			continue // other bets not active on come-out
		}
		out = append(out, res)
	}
	return out
}

// ResolvePointPhase resolves bets after a point-phase roll.
func ResolvePointPhase(bets []models.Bet, die1, die2, point int) []models.BetResult {
	total := die1 + die2
	phaseResult := EvalPointPhase(total, point)
	isHard := IsHardway(die1, die2)
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
		case models.BetPassOdds:
			switch phaseResult {
			case PointPhasePointHit:
				num, den := PassOddsPayout(point)
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * num / den
			case PointPhaseSevenOut:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			default:
				continue
			}
		case models.BetDontOdds:
			switch phaseResult {
			case PointPhasePointHit:
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			case PointPhaseSevenOut:
				num, den := DontPassOddsPayout(point)
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * num / den
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
		case models.BetHardway:
			if total == 7 {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else if total == b.Number && isHard {
				num, den := HardwayPayout(b.Number)
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * num / den
			} else if total == b.Number && !isHard {
				// Soft hit — hardway loses
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			} else {
				continue
			}
		case models.BetAnyCraps:
			if total == 2 || total == 3 || total == 12 {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * 7
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		case models.BetAnySeven:
			if total == 7 {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount * 4
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		case models.BetHighLow:
			if total == 7 {
				res.Outcome = models.BetPush
				res.NetChips = 0
			} else if (b.Number == 1 && IsHigh(total)) || (b.Number == 0 && IsLow(total)) {
				res.Outcome = models.BetWin
				res.NetChips = b.Amount
			} else {
				res.Outcome = models.BetLose
				res.NetChips = -b.Amount
			}
		default:
			continue
		}
		out = append(out, res)
	}
	return out
}

// IsOneRollBet returns true for bets that resolve on every roll.
func IsOneRollBet(t models.BetType) bool {
	return t == models.BetAnyCraps || t == models.BetAnySeven || t == models.BetHighLow
}

// IsPassPhaseBet returns true for bets only allowed in point phase.
func IsPassPhaseBet(t models.BetType) bool {
	return t == models.BetPassOdds || t == models.BetDontOdds ||
		t == models.BetPlace || t == models.BetHardway
}
