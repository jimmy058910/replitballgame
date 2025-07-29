#!/bin/bash

# Critical Logger Fix Script
# This fixes the TypeError: createLogger is not a function issue
# that prevents server startup in production

echo "🚀 Fixing logger TypeError in critical service files..."
echo "=================================================="

# Define the files that need fixing
FILES=(
  "server/services/webSocketService.ts"
  "server/services/matchStateManager.ts"
  "server/routes/tournamentFixRoutes.ts"
)

# Apply fixes to each file
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    
    # Remove the incorrect line that creates logger from createLogger function
    sed -i '/const logger = createLogger/d' "$file"
    
    # Change the incorrect import to the correct one
    sed -i 's/import createLogger from/import logger from/' "$file"
    
    echo "✅ Fixed $file"
  else
    echo "⚠️  Warning: $file not found, skipping..."
  fi
done

echo ""
echo "✅ All logger issues fixed!"
echo "🚀 Ready for deployment"
echo ""
echo "Next steps:"
echo "1. Run: ./deploy-production.sh"
echo "2. Or push to main branch for GitHub Actions deployment"