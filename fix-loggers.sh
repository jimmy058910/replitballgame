#!/bin/bash
set -e

echo "🚀 Refactoring logger in 3 files..."

# --- 1. webSocketService.ts ---
echo "Updating server/services/webSocketService.ts..."
# Delete the old multi-line logger block
sed -i '/\/\/ Production-friendly logging/,/};/d' server/services/webSocketService.ts
# Insert the new logger import and definition at the top
sed -i '1s,^,import createLogger from "..\/utils\/logger";\nconst logger = createLogger("WebSocket");\n,' server/services/webSocketService.ts
# Replace all instances of `log.` with `logger.`
sed -i 's/log\./logger\./g' server/services/webSocketService.ts

# --- 2. matchStateManager.ts ---
echo "Updating server/services/matchStateManager.ts..."
sed -i '/\/\/ Production-friendly logging/,/};/d' server/services/matchStateManager.ts
sed -i '1s,^,import createLogger from "..\/utils\/logger";\nconst logger = createLogger("MatchState");\n,' server/services/matchStateManager.ts
sed -i 's/log\./logger\./g' server/services/matchStateManager.ts

# --- 3. tournamentFixRoutes.ts ---
echo "Updating server/routes/tournamentFixRoutes.ts..."
sed -i '/\/\/ Production-friendly logging/,/};/d' server/routes/tournamentFixRoutes.ts
sed -i '1s,^,import createLogger from "..\/utils\/logger";\nconst logger = createLogger("TournamentFix");\n,' server/routes/tournamentFixRoutes.ts
sed -i 's/log\./logger\./g' server/routes/tournamentFixRoutes.ts

echo "✅ All files updated successfully."
