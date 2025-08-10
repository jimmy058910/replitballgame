#!/bin/bash

# Fix specific remaining route errors with exact patterns
echo "Fixing remaining route parameter types..."

# Fix dailyTournamentRoutes.ts line 337 - specific pattern
sed -i '337s/\.some(match => match/\.some((match: any) => match/g' server/routes/dailyTournamentRoutes.ts

# Fix tournamentStatusRoutes.ts patterns
sed -i 's/\.find(entry => entry/\.find((entry: any) => entry/g' server/routes/tournamentStatusRoutes.ts
sed -i 's/\.some(match => match/\.some((match: any) => match/g' server/routes/tournamentStatusRoutes.ts

echo "Route fixes completed!"
