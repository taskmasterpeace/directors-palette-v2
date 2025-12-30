#!/bin/bash
# Claude Code Statusline Installer
# Run: bash install-statusline.sh

mkdir -p .claude

# Create statusline script
printf '#!/bin/bash\nDIR=$(basename "$(pwd)")\nBRANCH=$(git branch --show-current 2>/dev/null)\necho "$DIR | $BRANCH"\n' > .claude/statusline.sh

# Create settings.json only if it doesn't exist
if [ ! -f .claude/settings.json ]; then
  printf '{\n  "statusLine": {\n    "type": "command",\n    "command": "bash .claude/statusline.sh"\n  }\n}\n' > .claude/settings.json
  echo "Created .claude/settings.json"
else
  echo ""
  echo "WARNING: .claude/settings.json already exists!"
  echo "Add this manually to your settings.json:"
  echo ""
  echo '  "statusLine": {'
  echo '    "type": "command",'
  echo '    "command": "bash .claude/statusline.sh"'
  echo '  },'
  echo ""
fi

echo "Statusline installed: $(bash .claude/statusline.sh)"
echo "Restart Claude Code to activate."
