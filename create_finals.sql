INSERT INTO "Game" (
  "tournamentId", "homeTeamId", "awayTeamId", 
  "homeScore", "awayScore", "status", "round", 
  "gameDate", "matchType", "simulated"
) VALUES (
  2, 4, 26, 
  0, 0, 'SCHEDULED', 3, 
  NOW() + INTERVAL '5 minutes', 'TOURNAMENT_DAILY', false
);
