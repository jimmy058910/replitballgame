#!/bin/bash

# Fix remaining TypeScript errors in services
echo "Fixing service files..."

# Fix agingService.ts
sed -i 's/\.map(p => /\.map((p: any) => /g' server/services/agingService.ts
sed -i 's/\.filter(p => /\.filter((p: any) => /g' server/services/agingService.ts
sed -i 's/\.reduce(sum, p) => /\.reduce((sum: any, p: any) => /g' server/services/agingService.ts
sed -i 's/\.forEach(player => /\.forEach((player: any) => /g' server/services/agingService.ts

# Fix camaraderieService.ts
sed -i 's/\.reduce(sum, player) => /\.reduce((sum: any, player: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.reduce(sum, p) => /\.reduce((sum: any, p: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.filter(p => /\.filter((p: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.forEach(p => /\.forEach((p: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.sort(a, b) => /\.sort((a: any, b: any) => /g' server/services/camaraderieService.ts
sed -i 's/\.map(p => /\.map((p: any) => /g' server/services/camaraderieService.ts

# Fix contractService.ts
sed -i 's/\.reduce(sum, contract) => /\.reduce((sum: any, contract: any) => /g' server/services/contractService.ts

# Fix dynamicMarketplaceService.ts
sed -i 's/\.filter(p => /\.filter((p: any) => /g' server/services/dynamicMarketplaceService.ts
sed -i 's/\.forEach(listing => /\.forEach((listing: any) => /g' server/services/dynamicMarketplaceService.ts
sed -i 's/\.filter(bid => /\.filter((bid: any) => /g' server/services/dynamicMarketplaceService.ts

# Fix enhancedMarketplaceService.ts
sed -i 's/\.map(tx => /\.map((tx: any) => /g' server/services/enhancedMarketplaceService.ts

# Fix awardsService.ts
sed -i 's/\.filter(p => /\.filter((p: any) => /g' server/services/awardsService.ts

echo "Fixed all service files!"
