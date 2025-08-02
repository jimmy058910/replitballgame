-- Export all table data using COPY commands
-- This exports data from all tables in the correct order

-- Check what tables exist first
\dt

-- Export UserProfile table
\copy "UserProfile" TO 'userprofile.csv' WITH CSV HEADER;

-- Export Season table  
\copy "Season" TO 'season.csv' WITH CSV HEADER;

-- Export League table
\copy "League" TO 'league.csv' WITH CSV HEADER;

-- Export Team table
\copy "Team" TO 'team.csv' WITH CSV HEADER;

-- Export Player table
\copy "Player" TO 'player.csv' WITH CSV HEADER;

-- Export Game table
\copy "Game" TO 'game.csv' WITH CSV HEADER;

-- Export Tournament table
\copy "Tournament" TO 'tournament.csv' WITH CSV HEADER;

-- Export TournamentTeam table
\copy "TournamentTeam" TO 'tournamentteam.csv' WITH CSV HEADER;

-- Export StoreItem table
\copy "StoreItem" TO 'storeitem.csv' WITH CSV HEADER;

-- Export any other tables that exist
\copy "PlayerRatingHistory" TO 'playerratinghistory.csv' WITH CSV HEADER;
\copy "Faction" TO 'faction.csv' WITH CSV HEADER;
\copy "Stadium" TO 'stadium.csv' WITH CSV HEADER;