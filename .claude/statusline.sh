#!/bin/bash
# Statusline script - reads JSON from Claude stdin
JQ="/c/Users/taskm/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe/jq.exe"

INPUT=$(cat)
CWD=$(echo "$INPUT" | "$JQ" -r '.workspace.current_dir // .cwd // empty')
DIR=$(basename "$CWD")
BRANCH=$(cd "$CWD" 2>/dev/null && git branch --show-current 2>/dev/null)

echo "📁 $DIR | 🌿 $BRANCH"
