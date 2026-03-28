package game

import "github.com/etanetan/street-craps/backend/internal/models"

// AllPlayersRolled returns true when every player has a determination roll for the given round.
func AllPlayersRolled(players []models.Player, rolls []models.ShooterRoll, round int) bool {
	for _, p := range players {
		found := false
		for _, r := range rolls {
			if r.PlayerID == p.ID && r.Round == round {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// FindWinner determines the shooter from determination rolls.
// Returns the winning playerID and the next round number if there's a tie (winner == "").
func FindWinner(players []models.Player, rolls []models.ShooterRoll, round int) (winnerID string, nextRound int, tiedPlayers []string) {
	// Collect rolls for this round
	rollMap := map[string]int{}
	for _, r := range rolls {
		if r.Round == round {
			rollMap[r.PlayerID] = r.Die
		}
	}

	// Find highest
	maxDie := 0
	for _, pid := range playerIDs(players) {
		if rollMap[pid] > maxDie {
			maxDie = rollMap[pid]
		}
	}

	// Collect tied
	var tied []string
	for _, pid := range playerIDs(players) {
		if rollMap[pid] == maxDie {
			tied = append(tied, pid)
		}
	}

	if len(tied) == 1 {
		return tied[0], round, nil
	}
	return "", round + 1, tied
}

func playerIDs(players []models.Player) []string {
	ids := make([]string, len(players))
	for i, p := range players {
		ids[i] = p.ID
	}
	return ids
}

// NextShooter returns the playerID of the next shooter (clockwise from current).
func NextShooter(players []models.Player, currentShooterID string) string {
	if len(players) == 0 {
		return ""
	}
	for i, p := range players {
		if p.ID == currentShooterID {
			return players[(i+1)%len(players)].ID
		}
	}
	return players[0].ID
}
