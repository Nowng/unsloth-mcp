#!/bin/bash
# =============================================================================
# Ralph Wiggum GRPO Training Loop
# =============================================================================
#
# This script runs GRPO fine-tuning iteratively until success criteria are met
# or max iterations reached.
#
# Usage:
#   ./run_ralph_grpo.sh              # Run with defaults (10 iterations max)
#   ./run_ralph_grpo.sh 5            # Run with 5 iterations max
#
# Prerequisites:
#   - Claude Code with ralph-wiggum plugin installed
#   - Or run manually without the plugin (see MANUAL section below)
#
# =============================================================================

MAX_ITERATIONS=${1:-10}
PROJECT_DIR="/Users/tmkipper/Desktop/tk_projects/unsloth-mcp-server"
PROMPT_FILE="$PROJECT_DIR/training-data/RALPH_PROMPT.md"

echo "============================================================"
echo "Ralph Wiggum GRPO Training Loop"
echo "============================================================"
echo "Max iterations: $MAX_ITERATIONS"
echo "Project: $PROJECT_DIR"
echo "Prompt: $PROMPT_FILE"
echo ""

# Option 1: Using Claude Code ralph-wiggum plugin
if command -v claude &> /dev/null; then
    echo "Starting Ralph loop via Claude Code..."
    cd "$PROJECT_DIR"
    
    # Using the official plugin command
    /ralph-loop "$(cat $PROMPT_FILE)" \
        --max-iterations $MAX_ITERATIONS \
        --completion-promise "TUNED"
fi

# Option 2: Manual loop (if plugin not available)
# Uncomment below to use manual bash loop

# echo "Starting manual Ralph loop..."
# ITERATION=0
# while [ $ITERATION -lt $MAX_ITERATIONS ]; do
#     ITERATION=$((ITERATION + 1))
#     echo ""
#     echo "============================================================"
#     echo "ITERATION $ITERATION of $MAX_ITERATIONS"
#     echo "============================================================"
#     
#     # Run the training script
#     cd "$PROJECT_DIR"
#     python training-data/train_grpo.py --iteration $ITERATION
#     
#     # Check if success criteria met
#     if grep -q "<promise>TUNED</promise>" training-data/experiments.md; then
#         echo ""
#         echo "✅ SUCCESS! Training complete."
#         exit 0
#     fi
#     
#     echo "Iteration $ITERATION complete. Continuing..."
# done
# 
# echo ""
# echo "⚠️  Max iterations ($MAX_ITERATIONS) reached without meeting criteria."
# echo "Check experiments.md for best results."

echo ""
echo "Done."
