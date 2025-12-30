#!/bin/bash
# Simple statusline - no JSON parsing needed
# pwd gives us the current directory when script runs

DIR=$(basename "$(pwd)")
BRANCH=$(git branch --show-current 2>/dev/null)

echo "$DIR | $BRANCH"
