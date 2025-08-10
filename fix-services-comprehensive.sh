#!/bin/bash

echo "Comprehensively fixing all parameter types in service files..."

# Fix agingService.ts - specific line patterns
sed -i 's/\.reduce((sum, p) => /\.reduce((sum: any, p: any) => /g' server/services/agingService.ts

# Fix camaraderieService.ts - specific patterns
sed -i 's/\.reduce((sum, player) => /\.reduce((sum: any, player: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.reduce((sum, p) => /\.reduce((sum: any, p: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.sort((a, b) => /\.sort((a: any, b: any) => /g' server/services/camaraderieService.ts

# Fix contractService.ts
sed -i 's/\.reduce((sum, contract) => /\.reduce((sum: any, contract: any) => /g' server/services/contractService.ts

# Fix dynamicMarketplaceService.ts
sed -i 's/\.forEach((listing) => /\.forEach((listing: any) => /g' server/services/dynamicMarketplaceService.ts
sed -i 's/\.filter((bid) => /\.filter((bid: any) => /g' server/services/dynamicMarketplaceService.ts

# Fix enhancedMarketplaceService.ts
sed -i 's/\.map((tx) => /\.map((tx: any) => /g' server/services/enhancedMarketplaceService.ts
sed -i 's/\.filter((listing) => /\.filter((listing: any) => /g' server/services/enhancedMarketplaceService.ts

# Fix paymentHistoryService.ts
sed -i 's/\.map((transaction) => /\.map((transaction: any) => /g' server/services/paymentHistoryService.ts
sed -i 's/\.reduce((acc, transaction) => /\.reduce((acc: any, transaction: any) => /g' server/services/paymentHistoryService.ts

# Fix playerAgingRetirementService.ts
sed -i 's/\.filter((t) => /\.filter((t: any) => /g' server/services/playerAgingRetirementService.ts
sed -i 's/\.forEach((player) => /\.forEach((player: any) => /g' server/services/playerAgingRetirementService.ts

# Fix playerContractInitializer.ts
sed -i 's/\.filter((p) => /\.filter((p: any) => /g' server/services/playerContractInitializer.ts
sed -i 's/\.filter((c) => /\.filter((c: any) => /g' server/services/playerContractInitializer.ts

# Fix playerSkillsService.ts
sed -i 's/\.filter((ps) => /\.filter((ps: any) => /g' server/services/playerSkillsService.ts
sed -i 's/\.map((skill) => /\.map((skill: any) => /g' server/services/playerSkillsService.ts

# Fix seasonTimingAutomationService.ts
sed -i 's/\.filter((m) => /\.filter((m: any) => /g' server/services/seasonTimingAutomationService.ts

echo "Service file fixes completed!"
