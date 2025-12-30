#!/bin/bash
# Statusline script - simple version that works

# Consume stdin (required by Claude Code)
cat > /dev/null

# Get directory name from PWD (script runs in project dir)
DIR=$(basename "$(pwd)")

# Get git branch
BRANCH=$(git branch --show-current 2>/dev/null)

echo "📁 $DIR | 🌿 $BRANCH"
