#!/bin/bash
# Git auto-backup hook - creates checkpoint before major changes

TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"

# Only trigger on high-impact tools
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Bash" ]]; then
    exit 0
fi

# Check for uncommitted changes
CHANGES=$(git status --short 2>/dev/null | wc -l)

# If 10+ files changed, create checkpoint
if [ "$CHANGES" -ge 10 ]; then
    echo "📦 Auto-backup: $CHANGES uncommitted files detected"

    # Create checkpoint commit
    git add -A
    git commit -m "chore: Auto-backup checkpoint - $CHANGES files before operation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" --no-verify

    echo "✅ Checkpoint created: $(git rev-parse --short HEAD)"
    echo "   Restore with: git reset --soft HEAD~1"
fi

exit 0
