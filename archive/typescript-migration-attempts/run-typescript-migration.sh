#!/bin/bash

# AUTOMATED TYPESCRIPT MIGRATION RUNNER
# This script runs the complete TypeScript migration loop for 5 iterations
# It monitors completion and automatically triggers the next iteration

echo "=========================================="
echo "AUTOMATED TYPESCRIPT MIGRATION - 5 ITERATIONS"
echo "Starting at: $(date)"
echo "=========================================="

# Configuration
MAX_ITERATIONS=5
CURRENT_ITERATION=3  # We've already done 3
TARGET_ERRORS=750
LOG_FILE=".claude/agents/migration-automation.log"

# Function to get current error count
get_error_count() {
    npx tsc -p tsconfig.migration.json --noEmit 2>&1 | grep -c "error TS" || echo "0"
}

# Function to check if agents are complete
check_agents_complete() {
    local complete=0
    
    # Check for all 4 agent result files
    if [ -f ".claude/agents/import-fixes.json" ] && \
       [ -f ".claude/agents/property-access-fixes.json" ] && \
       [ -f ".claude/agents/prisma-field-fixer-results.json" ] && \
       [ -f ".claude/agents/query-pattern-fixes.json" ]; then
        complete=1
    fi
    
    echo $complete
}

# Function to archive iteration
archive_iteration() {
    local iteration=$1
    echo "[$(date)] Archiving iteration $iteration..." | tee -a $LOG_FILE
    
    mkdir -p .claude/agents/archive/iteration-$iteration
    
    # Move all result files
    for file in analysis-results.json import-fixes.json property-access-fixes.json prisma-field-fixer-results.json query-pattern-fixes.json; do
        if [ -f ".claude/agents/$file" ]; then
            mv ".claude/agents/$file" ".claude/agents/archive/iteration-$iteration/" 2>/dev/null
        fi
    done
}

# Function to update progress
update_progress() {
    local iteration=$1
    local start_errors=$2
    local end_errors=$3
    
    cat > .claude/agents/migration-progress.json << EOF
{
  "currentIteration": $iteration,
  "currentErrors": $end_errors,
  "lastUpdate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "iterations": $iteration,
  "status": "running"
}
EOF
}

# Main automation loop
run_iteration() {
    local iteration=$1
    
    echo "================================================" | tee -a $LOG_FILE
    echo "[$(date)] STARTING ITERATION $iteration" | tee -a $LOG_FILE
    echo "================================================" | tee -a $LOG_FILE
    
    # Get starting errors
    START_ERRORS=$(get_error_count)
    echo "[$(date)] Starting errors: $START_ERRORS" | tee -a $LOG_FILE
    
    # Check if we should stop
    if [ $START_ERRORS -le $TARGET_ERRORS ]; then
        echo "[$(date)] SUCCESS! Reached target of <$TARGET_ERRORS errors" | tee -a $LOG_FILE
        return 1
    fi
    
    # Create trigger file for agents to detect
    echo "$iteration" > .claude/agents/current-iteration.txt
    echo "START" > .claude/agents/iteration-status.txt
    
    # Wait for analysis to complete (check every 30 seconds)
    echo "[$(date)] Waiting for analysis agent..." | tee -a $LOG_FILE
    while [ ! -f ".claude/agents/analysis-results.json" ]; do
        sleep 30
    done
    
    echo "[$(date)] Analysis complete, waiting for fix agents..." | tee -a $LOG_FILE
    
    # Wait for all 4 fix agents to complete (check every minute)
    while [ $(check_agents_complete) -eq 0 ]; do
        echo -n "."
        sleep 60
    done
    
    echo "" # New line after dots
    echo "[$(date)] All fix agents complete!" | tee -a $LOG_FILE
    
    # Get ending errors
    END_ERRORS=$(get_error_count)
    REDUCTION=$((START_ERRORS - END_ERRORS))
    
    echo "[$(date)] Iteration $iteration complete: $START_ERRORS → $END_ERRORS (reduction: $REDUCTION)" | tee -a $LOG_FILE
    
    # Archive this iteration
    archive_iteration $iteration
    
    # Update progress
    update_progress $iteration $START_ERRORS $END_ERRORS
    
    # Mark iteration complete
    echo "COMPLETE" > .claude/agents/iteration-status.txt
    
    # Check if we should continue
    if [ $REDUCTION -lt 10 ]; then
        echo "[$(date)] Diminishing returns (only $REDUCTION errors fixed)" | tee -a $LOG_FILE
        return 1
    fi
    
    return 0
}

# MAIN EXECUTION
echo "[$(date)] Starting automated TypeScript migration loop" | tee -a $LOG_FILE

# Run iterations 4 and 5
for i in 4 5; do
    run_iteration $i
    if [ $? -ne 0 ]; then
        echo "[$(date)] Stopping at iteration $i" | tee -a $LOG_FILE
        break
    fi
    
    # Small delay between iterations
    sleep 10
done

# Final summary
FINAL_ERRORS=$(get_error_count)
echo "=========================================="  | tee -a $LOG_FILE
echo "MIGRATION COMPLETE!" | tee -a $LOG_FILE
echo "Final error count: $FINAL_ERRORS" | tee -a $LOG_FILE
echo "Completed at: $(date)" | tee -a $LOG_FILE
echo "==========================================" | tee -a $LOG_FILE

# Signal completion
echo "DONE" > .claude/agents/iteration-status.txt