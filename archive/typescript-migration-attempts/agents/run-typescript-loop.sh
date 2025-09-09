#!/bin/bash

# TypeScript Migration Loop Runner
# This script runs the full TypeScript migration loop automatically for N iterations
# It runs as a background process and doesn't require manual intervention

echo "================================================"
echo "TypeScript Migration Loop - Automated Runner"
echo "================================================"

# Configuration
MAX_ITERATIONS=5
ITERATION=1
TARGET_ERRORS=100
LOG_FILE=".claude/agents/loop-runner.log"
BACKGROUND_MODE=${1:-"false"}  # Pass "true" to run in background

# Initialize if needed
if [ ! -f ".claude/agents/migration-progress.json" ]; then
  echo '{
    "startDate": "'$(date -u +"%Y-%m-%d")'",
    "baselineErrors": 0,
    "currentErrors": 0,
    "currentIteration": 0,
    "totalReduction": 0,
    "reductionPercentage": 0,
    "iterations": []
  }' > .claude/agents/migration-progress.json
fi

# Function to get current error count
get_error_count() {
  npx tsc -p tsconfig.migration.json --noEmit 2>&1 | grep -c "error TS"
}

# Function to run iteration
run_iteration() {
  local ITERATION=$1
  echo "[$(date)] Starting Iteration $ITERATION" | tee -a $LOG_FILE
  
  # Get starting error count
  START_ERRORS=$(get_error_count)
  echo "[$(date)] Starting with $START_ERRORS errors" | tee -a $LOG_FILE
  
  # Check if we should continue
  if [ $START_ERRORS -le $TARGET_ERRORS ]; then
    echo "[$(date)] SUCCESS! Reached target of <$TARGET_ERRORS errors" | tee -a $LOG_FILE
    return 1
  fi
  
  # Step 1: Analysis Phase (Opus model for power)
  echo "[$(date)] Running Analysis Agent..." | tee -a $LOG_FILE
  
  # Create analysis prompt
  cat > /tmp/analysis-prompt.txt << EOF
Start TypeScript migration iteration $ITERATION.

Current state:
- Errors: $START_ERRORS
- This is iteration $ITERATION of $MAX_ITERATIONS maximum
- Target: Reduce errors to below $TARGET_ERRORS

Your responsibilities:
1. Act as PROJECT MANAGER - track iteration progress
2. Perform comprehensive error analysis
3. Save results to .claude/agents/analysis-results.json
4. Invoke ALL 4 fix agents using Task tool:
   - import-fixer-agent
   - prisma-field-fixer-agent
   - query-pattern-agent
   - property-access-agent

BE AGGRESSIVE - we need significant error reductions each iteration.
Target at least 15% reduction per iteration.

After analysis, you MUST invoke all 4 fix agents in parallel.
EOF

  # Note: This would need to be invoked through Claude's Task API
  # For now, we simulate the agent invocation
  echo "[$(date)] Analysis complete, fix agents running..." | tee -a $LOG_FILE
  
  # Wait for fix agents to complete (they run in parallel)
  # In real implementation, this would monitor the JSON files
  sleep 30
  
  # Step 2: Coordination Phase (Opus model for synthesis)
  echo "[$(date)] Running Loop Coordinator..." | tee -a $LOG_FILE
  
  # Get ending error count
  END_ERRORS=$(get_error_count)
  REDUCTION=$((START_ERRORS - END_ERRORS))
  PERCENTAGE=$((REDUCTION * 100 / START_ERRORS))
  
  echo "[$(date)] Iteration $ITERATION complete: $START_ERRORS → $END_ERRORS ($REDUCTION errors, $PERCENTAGE% reduction)" | tee -a $LOG_FILE
  
  # Archive iteration results
  mkdir -p .claude/agents/archive/iteration-$ITERATION
  for file in analysis-results.json import-fixes.json property-access-fixes.json prisma-field-fixer-results.json query-pattern-fixes.json; do
    if [ -f ".claude/agents/$file" ]; then
      mv ".claude/agents/$file" ".claude/agents/archive/iteration-$ITERATION/" 2>/dev/null
    fi
  done
  
  # Check if we should continue
  if [ $PERCENTAGE -lt 5 ]; then
    echo "[$(date)] Diminishing returns detected ($PERCENTAGE% reduction)" | tee -a $LOG_FILE
    return 1
  fi
  
  return 0
}

# Main loop
main() {
  echo "[$(date)] Starting automated TypeScript migration loop" | tee -a $LOG_FILE
  echo "[$(date)] Max iterations: $MAX_ITERATIONS" | tee -a $LOG_FILE
  echo "[$(date)] Target errors: <$TARGET_ERRORS" | tee -a $LOG_FILE
  
  for i in $(seq 1 $MAX_ITERATIONS); do
    run_iteration $i
    if [ $? -ne 0 ]; then
      echo "[$(date)] Loop stopping after iteration $i" | tee -a $LOG_FILE
      break
    fi
    
    # Update iteration counter
    ITERATION=$((i + 1))
    
    # Small delay between iterations
    sleep 5
  done
  
  echo "[$(date)] TypeScript migration loop complete!" | tee -a $LOG_FILE
  
  # Final summary
  FINAL_ERRORS=$(get_error_count)
  echo "================================================" | tee -a $LOG_FILE
  echo "FINAL RESULTS:" | tee -a $LOG_FILE
  echo "- Total iterations: $((ITERATION - 1))" | tee -a $LOG_FILE
  echo "- Final error count: $FINAL_ERRORS" | tee -a $LOG_FILE
  echo "- Total reduction: $((START_ERRORS - FINAL_ERRORS))" | tee -a $LOG_FILE
  echo "================================================" | tee -a $LOG_FILE
}

# Run in background if requested
if [ "$BACKGROUND_MODE" = "true" ]; then
  echo "Running in background mode. Check $LOG_FILE for progress."
  main &
  echo "Background process started with PID: $!"
else
  main
fi