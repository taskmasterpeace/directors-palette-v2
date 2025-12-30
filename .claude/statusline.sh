#!/bin/bash
# cc-statusline - Claude Code Status Line
# Windows-compatible version

# Read JSON from stdin (Claude Code provides context)
INPUT=$(cat)

# Try to parse with jq if available
JQ_PATH="/c/Users/taskm/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe/jq.exe"

if [ -x "$JQ_PATH" ]; then
    MODEL=$("$JQ_PATH" -r '.model // "Claude"' <<< "$INPUT" 2>/dev/null)
    CWD=$("$JQ_PATH" -r '.cwd // "."' <<< "$INPUT" 2>/dev/null)
elif command -v jq &> /dev/null; then
    MODEL=$(jq -r '.model // "Claude"' <<< "$INPUT" 2>/dev/null)
    CWD=$(jq -r '.cwd // "."' <<< "$INPUT" 2>/dev/null)
else
    # Fallback without jq
    MODEL="Claude"
    CWD=$(pwd)
fi

# Get directory name
DIR_NAME=$(basename "$CWD" 2>/dev/null || echo "project")

# Get git branch if in a repo
GIT_BRANCH=""
if [ -d "$CWD/.git" ] || git -C "$CWD" rev-parse --git-dir &>/dev/null 2>&1; then
    GIT_BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null)
fi

# Build status line
STATUS="🤖 ${MODEL} │ 📁 ${DIR_NAME}"

if [ -n "$GIT_BRANCH" ]; then
    STATUS="${STATUS} │ 🌿 ${GIT_BRANCH}"
fi

echo "$STATUS"
