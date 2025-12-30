#!/bin/bash
# Simple statusline - folder name and git branch
# Claude Code runs this from workspace directory, so pwd works directly

DIR=$(basename "$(pwd)")
BRANCH=$(git branch --show-current 2>/dev/null)

echo "📁 $DIR | 🌿 $BRANCH"
