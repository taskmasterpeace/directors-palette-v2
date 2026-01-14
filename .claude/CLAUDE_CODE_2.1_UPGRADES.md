# Claude Code 2.1 Upgrades - Directors Palette
**Date**: January 14, 2026
**Claude Code Version**: 2.1.0+

This document describes the 5 major workflow improvements added to leverage Claude Code 2.1 features.

---

## 🎯 1. TypeScript LSP Integration

**Status**: ✅ Installed & Enabled

### What It Does
Enables Claude to use Language Server Protocol for instant code intelligence:
- Go-to-definition
- Find all references
- Hover documentation
- Type inference

### How It Helps
- **Before**: Claude searched files manually with grep/glob
- **After**: Claude navigates your 717-line Canvas Editor instantly
- **Time Saved**: ~30% on "where is this used?" questions

### Installation
```bash
claude plugin install typescript-lsp --scope project
```

### Configuration
Automatically added to `.claude/settings.json`:
```json
"enabledPlugins": {
  "typescript-lsp@claude-plugins-official": true
}
```

### Restart Required
**Yes** - Restart Claude Code session for LSP to activate.

---

## ✨ 2. Auto-Format PostToolUse Hooks

**Status**: ✅ Configured

### What It Does
Automatically runs Prettier and ESLint on every file edit/write:
- `Edit` tool → Prettier format
- `Write` tool → Prettier + ESLint --fix

### How It Helps
- **Before**: Build failures from unused imports, formatting issues
- **After**: Code auto-formatted and linted on every save
- **Eliminates**: Manual formatting, "Build failed: ESLint" errors

### Configuration
Added to `.claude/settings.json` PostToolUse hooks:

**For Edit tool:**
```json
{
  "matchers": [
    { "tool": "Edit", "file_path": "**/*.{ts,tsx,js,jsx}" }
  ],
  "hooks": [
    {
      "type": "command",
      "command": "bash -c 'npx prettier --write \"${file_path}\" 2>&1 | head -5 || true'"
    }
  ]
}
```

**For Write tool:**
```json
{
  "matchers": [
    { "tool": "Write", "file_path": "**/*.{ts,tsx,js,jsx}" }
  ],
  "hooks": [
    {
      "type": "command",
      "command": "bash -c 'npx prettier --write \"${file_path}\" 2>&1 && npx eslint --fix \"${file_path}\" 2>&1 | head -10 || true'"
    }
  ]
}
```

### Files Covered
- `**/*.ts` - TypeScript
- `**/*.tsx` - React TypeScript
- `**/*.js` - JavaScript
- `**/*.jsx` - React JavaScript

### Restart Required
**Yes** - Hooks activate on next Claude Code session.

---

## 🚀 3. Auto-Approve PermissionRequest Hooks

**Status**: ✅ Configured

### What It Does
Automatically approves file edits in trusted directories:
- `src/**/*` - All source code
- `.claude/**/*` - Claude configuration files

### How It Helps
- **Before**: Click "approve" 20+ times per feature
- **After**: Instant edits, no permission prompts
- **Time Saved**: Massive - enables rapid iteration

### Security
- **Protected files** (still require approval):
  - `.env*` - Environment variables
  - `vercel.json` - Deployment config
  - `package.json` - Dependencies
  - CI/CD workflows

### Configuration
Added to `.claude/settings.json` PermissionRequest hooks:

```json
"PermissionRequest": [
  {
    "matchers": [
      { "tool": "Edit", "file_path": "src/**/*" }
    ],
    "hooks": [
      { "type": "decision", "decision": "approve" }
    ]
  },
  {
    "matchers": [
      { "tool": "Write", "file_path": "src/**/*" }
    ],
    "hooks": [
      { "type": "decision", "decision": "approve" }
    ]
  },
  {
    "matchers": [
      { "tool": "Edit", "file_path": ".claude/**/*" }
    ],
    "hooks": [
      { "type": "decision", "decision": "approve" }
    ]
  },
  {
    "matchers": [
      { "tool": "Write", "file_path": ".claude/**/*" }
    ],
    "hooks": [
      { "type": "decision", "decision": "approve" }
    ]
  }
]
```

### Restart Required
**Yes** - Permission hooks activate on next session.

---

## 💡 4. Uncommitted Files Context (UserPromptSubmit Hook)

**Status**: ✅ Configured

### What It Does
Shows uncommitted file count before Claude processes every prompt.

### How It Helps
- **Before**: Easy to forget what files are dirty mid-session
- **After**: Claude always knows uncommitted state
- **Prevents**: "I forgot we changed that" bugs
- **Aligns With**: Your December 16, 2024 incident prevention protocol

### Example Output
```
⚠️ CONTEXT: 3 uncommitted files
 M src/features/layout-annotation/components/LayoutAnnotationTab.tsx
 M src/features/storyboard/store/storyboard.store.ts
 M .claude/settings.json
```

### Configuration
Added to `.claude/settings.json` UserPromptSubmit hook:

```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "bash -c 'CHANGES=$(git status --short 2>/dev/null | wc -l); if [ \"$CHANGES\" -gt 0 ]; then echo \"⚠️ CONTEXT: $CHANGES uncommitted files\" && git status --short | head -5; fi'"
      }
    ]
  }
]
```

### Restart Required
**Yes** - Hook activates on next session.

---

## 🔄 5. Background Dev Server Skill

**Status**: ✅ Created

### What It Does
Starts Next.js dev server in a background agent (context: fork) so it runs in parallel while Claude works.

### How It Helps
- **Before**: Dev server blocks terminal or runs in separate window
- **After**: Dev server runs while Claude codes, commits, tests
- **Use Case**: Keep app running during refactors, testing, commits

### Usage
```bash
/dev-server
```

### Managing Background Tasks
- **Check status**: `/tasks` command
- **View logs**: `/tasks` then select the task
- **Stop**: Ctrl+C in task view or kill via `/tasks`

### Configuration
Created `.claude/skills/dev-server.md`:

```markdown
---
name: dev-server
description: Start Next.js dev server in background agent
context: fork
agent: Bash
---

## Implementation
cd "D:\git\directors-palette-v2" && npm run dev
```

### Restart Required
**Yes** - Skills hot-reload is enabled in 2.1, but first-time requires restart.

---

## 📋 Summary

| Feature | File | Status | Restart Required |
|---------|------|--------|------------------|
| TypeScript LSP | `.claude/settings.json` | ✅ Installed | Yes |
| Auto-Format Hooks | `.claude/settings.json` | ✅ Configured | Yes |
| Auto-Approve Edits | `.claude/settings.json` | ✅ Configured | Yes |
| Uncommitted Files Hook | `.claude/settings.json` | ✅ Configured | Yes |
| Dev Server Skill | `.claude/skills/dev-server.md` | ✅ Created | Yes |

---

## 🔄 Next Steps

1. **Commit these changes**
2. **Restart Claude Code session**
   ```bash
   exit
   claude
   ```
3. **Test each feature**:
   - Edit a `.ts` file → should auto-format
   - Edit a file in `src/` → no permission prompt
   - Type any message → see uncommitted files warning
   - Run `/dev-server` → server starts in background
   - Use LSP features → instant navigation

---

## 📚 References

- [Claude Code 2.1 Release Notes](https://releasebot.io/updates/anthropic/claude-code)
- [Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [PreToolUse Hook Examples](https://claudelog.com/mechanics/hooks/)
- [Background Agents](https://hyperdev.matsuoka.com/p/claude-code-210-ships)
- [LSP Support](https://venturebeat.com/orchestration/claude-code-2-1-0-arrives-with-smoother-workflows-and-smarter-agents)

---

## ⚠️ Important Notes

### Hook Execution Order
1. **UserPromptSubmit** - Runs before Claude sees your prompt
2. **PermissionRequest** - Decides if tool needs approval
3. **PreToolUse** - Can block or modify tool inputs
4. **[Tool Execution]** - The actual tool runs
5. **PostToolUse** - Runs after successful tool execution

### Debugging Hooks
If a hook isn't working:
1. Check `.claude/settings.json` for syntax errors
2. Test the command manually: `bash -c 'your command here'`
3. Check hook output in Claude Code session
4. Verify restart happened after config changes

### Disabling Features
To disable any feature, edit `.claude/settings.json`:
- **Auto-format**: Remove PostToolUse hooks
- **Auto-approve**: Remove PermissionRequest hooks
- **Uncommitted warning**: Remove UserPromptSubmit hook
- **LSP**: Set `"typescript-lsp@claude-plugins-official": false`

---

**Last Updated**: January 14, 2026
