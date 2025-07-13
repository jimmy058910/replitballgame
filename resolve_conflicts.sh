#!/bin/bash

# Function to resolve conflicts by taking jules-testing-merges version
resolve_file() {
    local file="$1"
    echo "Resolving conflicts in $file"
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Remove conflict markers and take jules-testing-merges version
    sed '/^<<<<<<< HEAD$/,/^=======$/d; /^>>>>>>> jules-testing-merges$/d' "$file" > "$temp_file"
    
    # Replace original with resolved content
    mv "$temp_file" "$file"
}

# Files with conflicts
files_with_conflicts=(
    "client/src/components/ContractNegotiation.tsx"
    "client/src/components/EnhancedDashboard.tsx"
    "client/src/components/LeagueStandings.tsx"
    "client/src/components/Navigation.tsx"
    "client/src/components/PlayerDetailModal.tsx"
    "client/src/components/StaffManagement.tsx"
    "client/src/components/TaxiSquadManager.tsx"
    "client/src/components/TeamFinances.tsx"
    "client/src/components/TeamInfoDialog.tsx"
    "client/src/components/TextBasedMatch.tsx"
    "client/src/components/TryoutSystem.tsx"
    "client/src/pages/Competition.tsx"
    "client/src/pages/Dashboard.tsx"
    "client/src/pages/Inventory.tsx"
    "client/src/pages/Payments.tsx"
    "client/src/pages/Store.tsx"
    "client/src/pages/SuperUser.tsx"
    "client/src/pages/Team.tsx"
    "client/src/pages/TextMatch.tsx"
    "server/routes.ts"
)

# Resolve conflicts in each file
for file in "${files_with_conflicts[@]}"; do
    if [ -f "$file" ]; then
        resolve_file "$file"
    fi
done

echo "All conflicts resolved!"
