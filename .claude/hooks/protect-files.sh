#!/bin/bash
# File protection hook - blocks edits to sensitive files

# Get the tool being used and file path from environment
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
FILE_PATH="${CLAUDE_TOOL_PARAMS_FILE_PATH:-}"

# Only check Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
    exit 0
fi

# Protected file patterns
PROTECTED_PATTERNS=(
    "^\.env(\..*)?"
    "credentials\.json$"
    "service-account\.json$"
    ".*\.pem$"
    ".*\.key$"
    "^\.npmrc$"
    "^vercel\.json$"
    "^\.github/workflows/.*\.ya?ml$"
)

# Check if file matches any protected pattern
for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$FILE_PATH" | grep -qE "$pattern"; then
        echo "🚨 BLOCKED: Cannot edit protected file: $FILE_PATH"
        echo ""
        echo "Protected files:"
        echo "  • .env* - Environment variables (may contain secrets)"
        echo "  • credentials.json - API keys and tokens"
        echo "  • *.pem, *.key - Private keys"
        echo "  • vercel.json - Production deployment config"
        echo "  • .github/workflows/* - CI/CD pipelines"
        echo ""
        echo "If you need to edit this file:"
        echo "  1. Manually edit with your text editor"
        echo "  2. Or temporarily disable this hook in .claude/settings.json"
        exit 1
    fi
done

# Allow the operation
exit 0
