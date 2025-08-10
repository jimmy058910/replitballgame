#!/bin/bash

# Fix specific remaining route errors
echo "Fixing specific route errors..."

# Fix dailyTournamentRoutes.ts line 337
sed -i 's/\.some(match => match/\.some((match: any) => match/g' server/routes/dailyTournamentRoutes.ts

# Fix tournamentStatusRoutes.ts
sed -i 's/\.find(entry => /\.find((entry: any) => /g' server/routes/tournamentStatusRoutes.ts
sed -i 's/\.filter(entry => /\.filter((entry: any) => /g' server/routes/tournamentStatusRoutes.ts
sed -i 's/\.some(match => /\.some((match: any) => /g' server/routes/tournamentStatusRoutes.ts

echo "Fixed route-specific errors!"
