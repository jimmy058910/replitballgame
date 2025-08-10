#!/bin/bash

echo "Fixing remaining specific parameter type errors..."

# Fix specific files with targeted replacements
sed -i 's/\.reduce((acc, transaction) => /\.reduce((acc: any, transaction: any) => /g' server/services/paymentHistoryService.ts
sed -i 's/\.filter(skill => /\.filter((skill: any) => /g' server/services/playerSkillsService.ts
sed -i 's/\.forEach(game => /\.forEach((game: any) => /g' server/services/statsService.ts
sed -i 's/\.forEach(match => /\.forEach((match: any) => /g' server/services/tournamentRecoveryService.ts

# Fix tournamentService.ts specific patterns
sed -i 's/\.map(e => /\.map((e: any) => /g' server/services/tournamentService.ts
sed -i 's/\.filter(t => /\.filter((t: any) => /g' server/services/tournamentService.ts
sed -i 's/\.map(team => /\.map((team: any) => /g' server/services/tournamentService.ts
sed -i 's/({ tournament }, entry) => /({ tournament }: any, entry: any) => /g' server/services/tournamentService.ts
sed -i 's/({ tournament }) => /({ tournament }: any) => /g' server/services/tournamentService.ts

echo "All parameter type fixes completed!"
