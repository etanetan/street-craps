// Package game contains pure craps rule functions (no side effects).
package game

// ComeOutResult describes what a come-out roll means.
type ComeOutResult int

const (
	ComeOutNatural ComeOutResult = iota // 7 or 11 — shooter wins
	ComeOutCraps                        // 2, 3, 12 — shooter loses round
	ComeOutPoint                        // 4,5,6,8,9,10 — point is set
)

// EvalComeOut returns the result of a come-out roll.
func EvalComeOut(total int) ComeOutResult {
	switch total {
	case 7, 11:
		return ComeOutNatural
	case 2, 3, 12:
		return ComeOutCraps
	default:
		return ComeOutPoint
	}
}

// PointPhaseResult describes what a point-phase roll means.
type PointPhaseResult int

const (
	PointPhasePointHit PointPhaseResult = iota // rolled the point — shooter wins
	PointPhaseSevenOut                          // rolled 7 — dice pass
	PointPhaseOther                             // no effect on phase
)

// EvalPointPhase returns the result of a roll during the point phase.
func EvalPointPhase(total, point int) PointPhaseResult {
	switch {
	case total == point:
		return PointPhasePointHit
	case total == 7:
		return PointPhaseSevenOut
	default:
		return PointPhaseOther
	}
}

// IsHardway returns true if die1+die2 is a hardway combination (both dice equal).
func IsHardway(die1, die2 int) bool {
	return die1 == die2
}

// IsHigh returns true if the total is 8–12 (excluding 7 which is a push).
func IsHigh(total int) bool {
	return total >= 8 && total <= 12
}

// IsLow returns true if the total is 2–6.
func IsLow(total int) bool {
	return total >= 2 && total <= 6
}

// PassOddsPayout returns (numerator, denominator) for pass-line odds bets.
// Multiply bet * num / den to get winnings.
func PassOddsPayout(point int) (int64, int64) {
	switch point {
	case 4, 10:
		return 2, 1
	case 5, 9:
		return 3, 2
	case 6, 8:
		return 6, 5
	}
	return 1, 1
}

// DontPassOddsPayout returns (numerator, denominator) for don't-pass odds bets.
func DontPassOddsPayout(point int) (int64, int64) {
	switch point {
	case 4, 10:
		return 1, 2
	case 5, 9:
		return 2, 3
	case 6, 8:
		return 5, 6
	}
	return 1, 1
}

// PlacePayout returns (num, den) for place bets (number hits before 7).
// Pays true odds: 2:1 for 4/10, 3:2 for 5/9, 6:5 for 6/8.
func PlacePayout(number int) (int64, int64) {
	switch number {
	case 4, 10:
		return 2, 1
	case 5, 9:
		return 3, 2
	case 6, 8:
		return 6, 5
	}
	return 1, 1
}

// LayPlaceWin returns the profit for a lay-place bet (non-shooter) when 7 hits.
// The lay amount is the full wager; win = amount * den / num.
func LayPlaceWin(layAmount int64, number int) int64 {
	num, den := PlacePayout(number)
	return layAmount * den / num
}
