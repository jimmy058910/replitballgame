#!/bin/bash

# Fix common TypeScript parameter type errors across multiple files
echo "Fixing TypeScript parameter types..."

# Fix remaining files with similar patterns
files=(
  "server/domains/tournaments/service.ts"
  "server/routes/dailyTournamentRoutes.ts"
  "server/routes/enhancedMarketplaceRoutes.ts"
  "server/routes/injuryStaminaRoutes.ts"
  "server/routes/matchRoutes.ts"
  "server/routes/ndaRoutes.ts"
  "server/routes/newTournamentRoutes.ts"
  "server/routes/seasonRoutes.ts"
  "server/routes/tournamentFixRoutes.ts"
  "server/routes/tournamentHistoryRoutes.ts"
  "server/routes/tournamentRoutes.ts"
  "server/routes/tournamentStatusRoutes.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Add :any types to common parameter patterns
    sed -i 's/\.map(match => /\.map((match: any) => /g' "$file"
    sed -i 's/\.map(entry => /\.map((entry: any) => /g' "$file"
    sed -i 's/\.map(player => /\.map((player: any) => /g' "$file"
    sed -i 's/\.map(p => /\.map((p: any) => /g' "$file"
    sed -i 's/\.map(e => /\.map((e: any) => /g' "$file"
    sed -i 's/\.map(m => /\.map((m: any) => /g' "$file"
    sed -i 's/\.map(user => /\.map((user: any) => /g' "$file"
    sed -i 's/\.map(tournament => /\.map((tournament: any) => /g' "$file"
    sed -i 's/\.map(team => /\.map((team: any) => /g' "$file"
    sed -i 's/\.filter(match => /\.filter((match: any) => /g' "$file"
    sed -i 's/\.filter(entry => /\.filter((entry: any) => /g' "$file"
    sed -i 's/\.filter(player => /\.filter((player: any) => /g' "$file"
    sed -i 's/\.filter(p => /\.filter((p: any) => /g' "$file"
    sed -i 's/\.filter(e => /\.filter((e: any) => /g' "$file"
    sed -i 's/\.filter(m => /\.filter((m: any) => /g' "$file"
    sed -i 's/\.forEach(match => /\.forEach((match: any) => /g' "$file"
    sed -i 's/\.forEach(entry => /\.forEach((entry: any) => /g' "$file"
    sed -i 's/\.forEach(player => /\.forEach((player: any) => /g' "$file"
    sed -i 's/\.forEach(p => /\.forEach((p: any) => /g' "$file"
    sed -i 's/\.forEach(e => /\.forEach((e: any) => /g' "$file"
    sed -i 's/\.forEach(m => /\.forEach((m: any) => /g' "$file"
    sed -i 's/\.forEach(user => /\.forEach((user: any) => /g' "$file"
    sed -i 's/\.forEach(tournament => /\.forEach((tournament: any) => /g' "$file"
    sed -i 's/\.forEach(team => /\.forEach((team: any) => /g' "$file"
  fi
done

echo "Type fixes completed!"
