#!/bin/bash
# cc-statusline - Claude Code Status Line
# Basic version for Windows

# Get working directory (last component)
DIR_NAME=$(basename "$(pwd)")

# Get git branch if in a repo
GIT_BRANCH=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null)
fi

# Build status line
STATUS="📁 ${DIR_NAME}"

if [ -n "$GIT_BRANCH" ]; then
    STATUS="${STATUS} │ 🌿 ${GIT_BRANCH}"
fi

# Add model info if available
if [ -n "$CLAUDE_MODEL" ]; then
    STATUS="${STATUS} │ 🤖 ${CLAUDE_MODEL}"
fi

echo "$STATUS"
