# Test Plan: Claude Code 2.1 Features
**Date**: January 14, 2026
**Status**: ✅ settings.json FIXED - Ready to test after restart

---

## ⚠️ IMPORTANT: Restart Required

All 5 features require a Claude Code restart to activate:

```bash
# Exit current session
exit

# Start new session
claude
```

---

## ✅ Feature 1: TypeScript LSP (Code Intelligence)

### What to Test
Claude should be able to navigate code instantly using LSP.

### Test Steps

1. **Ask Claude to find where a function is defined**:
   ```
   Where is the useCanvasSettings hook defined?
   ```

2. **Ask Claude to find all references**:
   ```
   Find all files that use the useLayoutAnnotationStore
   ```

3. **Ask Claude about types**:
   ```
   What's the type signature of CanvasState?
   ```

### Expected Result
- ✅ Claude navigates instantly (no grep/glob searching)
- ✅ Accurate file paths with line numbers
- ✅ Complete type information

### Status
- [x] Plugin installed: `typescript-lsp@claude-plugins-official`
- [x] Enabled in settings.json
- [ ] Tested after restart

---

## ✅ Feature 2: Auto-Format PostToolUse Hooks

### What to Test
Files should auto-format after every Edit/Write operation.

### Test Steps

1. **Ask Claude to edit a TypeScript file with bad formatting**:
   ```
   Add a comment to src/app/page.tsx with intentionally bad spacing
   ```

2. **Check the file**:
   ```bash
   cat src/app/page.tsx
   ```

3. **Verify Prettier ran**:
   - File should be properly formatted
   - Spacing should be corrected
   - No unused imports

### Expected Result
- ✅ Prettier runs automatically (no manual formatting needed)
- ✅ ESLint --fix runs on Write operations
- ✅ Console shows hook output: "Checking formatting..."

### Hook Output to Watch For
```
Running hook: bash -c 'npx prettier --write "${file_path}"...'
```

### Status
- [x] PostToolUse hooks configured
- [x] Matchers: `**/*.{ts,tsx,js,jsx}`
- [ ] Tested after restart

---

## ✅ Feature 3: Auto-Approve PermissionRequest Hooks

### What to Test
Edits in `src/` and `.claude/` should not require permission prompts.

### Test Steps

1. **Ask Claude to edit a source file**:
   ```
   Add a TODO comment to src/features/layout-annotation/types/canvas.types.ts
   ```

2. **Watch for permission prompts**:
   - Should NOT see "Allow Claude to edit src/..." prompt
   - Edit should happen instantly

3. **Ask Claude to edit a protected file**:
   ```
   Add a comment to package.json
   ```

4. **Watch for permission prompts**:
   - SHOULD see permission prompt (protected file)

### Expected Result
- ✅ No prompts for `src/**/*` edits
- ✅ No prompts for `.claude/**/*` edits
- ✅ Still prompts for `.env`, `package.json`, `vercel.json`

### Hook Output to Watch For
```
Running hook: echo approve
Result: approve
```

### Status
- [x] PermissionRequest hooks configured
- [x] FIXED: Changed from invalid 'type: decision' to 'type: command'
- [x] Matchers: src/**, .claude/**
- [ ] Tested after restart

---

## ✅ Feature 4: Uncommitted Files Context (UserPromptSubmit Hook)

### What to Test
Every prompt should show uncommitted file count.

### Test Steps

1. **Make a change without committing**:
   ```bash
   echo "// test" >> src/app/page.tsx
   ```

2. **Send any message to Claude**:
   ```
   What's the current git status?
   ```

3. **Check for context warning**:
   Should see BEFORE Claude responds:
   ```
   ⚠️ CONTEXT: 1 uncommitted files
    M src/app/page.tsx
   ```

4. **Commit the change**:
   ```bash
   git checkout src/app/page.tsx
   ```

5. **Send another message**:
   ```
   Thanks
   ```

6. **Verify no warning** (git is clean)

### Expected Result
- ✅ Warning appears before EVERY prompt when files are uncommitted
- ✅ Shows first 5 uncommitted files
- ✅ No warning when git is clean

### Hook Output to Watch For
```
Running hook: bash -c 'CHANGES=$(git status --short...)'
⚠️ CONTEXT: 3 uncommitted files
 M src/features/layout-annotation/components/LayoutAnnotationTab.tsx
 M src/features/storyboard/store/storyboard.store.ts
 M .claude/settings.json
```

### Status
- [x] UserPromptSubmit hook configured
- [ ] Tested after restart

---

## ✅ Feature 5: Background Dev Server Skill

### What to Test
Dev server should run in background while Claude works.

### Test Steps

1. **Start the background dev server**:
   ```
   /dev-server
   ```

2. **Verify it launched**:
   - Should see: "Starting background task..."
   - Should NOT block terminal

3. **Check background tasks**:
   ```
   /tasks
   ```

4. **Ask Claude to work while server runs**:
   ```
   Read src/app/layout.tsx and explain it
   ```

5. **Verify server is still running**:
   ```bash
   curl http://localhost:3000
   ```

6. **Stop the server**:
   - Use `/tasks` command
   - Select the dev-server task
   - Press Ctrl+C

### Expected Result
- ✅ Server starts in background (forked agent)
- ✅ Claude can work while server runs
- ✅ Server accessible at http://localhost:3000
- ✅ `/tasks` shows running background agent

### Skill Output to Watch For
```
Launching background agent: dev-server
Context: fork
Agent: Bash
Command: cd "D:\git\directors-palette-v2" && npm run dev
```

### Status
- [x] Skill created: `.claude/skills/dev-server.md`
- [x] Context: fork (runs in background)
- [ ] Tested after restart

---

## 🔧 Validation Commands

Run these to verify configuration before testing:

```bash
# 1. Verify JSON is valid
npx jsonlint .claude/settings.json

# 2. Check plugin is installed
claude plugin list

# 3. Verify hooks are configured
cat .claude/settings.json | grep -A 3 "PostToolUse"
cat .claude/settings.json | grep -A 3 "PermissionRequest"
cat .claude/settings.json | grep -A 3 "UserPromptSubmit"

# 4. Verify skill exists
ls -la .claude/skills/
cat .claude/skills/dev-server.md

# 5. Verify build still works
npm run build
```

---

## 📊 Test Results Checklist

After restart, mark each test:

**Feature 1: TypeScript LSP**
- [ ] Instant go-to-definition works
- [ ] Find all references works
- [ ] Type information available

**Feature 2: Auto-Format**
- [ ] Prettier runs on Edit
- [ ] ESLint runs on Write
- [ ] No manual formatting needed

**Feature 3: Auto-Approve**
- [ ] No prompts for src/ edits
- [ ] No prompts for .claude/ edits
- [ ] Still prompts for protected files

**Feature 4: Uncommitted Files**
- [ ] Warning shows with dirty git
- [ ] Shows file list (max 5)
- [ ] No warning with clean git

**Feature 5: Background Dev Server**
- [ ] /dev-server launches in background
- [ ] Server accessible while Claude works
- [ ] /tasks shows running agent
- [ ] Can stop via /tasks

---

## 🐛 Troubleshooting

### If LSP doesn't work:
```bash
# Check plugin status
claude plugin list

# Reinstall if needed
claude plugin uninstall typescript-lsp
claude plugin install typescript-lsp --scope project
```

### If hooks don't run:
```bash
# Verify restart happened
# Check hook syntax
cat .claude/settings.json | npx jsonlint

# Enable hook debugging (if available)
claude --verbose
```

### If /dev-server not found:
```bash
# Check skill exists
ls -la .claude/skills/dev-server.md

# Skills should hot-reload, but force restart if needed
exit
claude
```

### If auto-approve not working:
```bash
# Verify PermissionRequest hooks use 'command' type
grep -A 2 "PermissionRequest" .claude/settings.json

# Should see: "type": "command"
# NOT: "type": "decision"
```

---

## ✅ Success Criteria

All 5 features should:
1. Activate without errors after restart
2. Produce expected outputs
3. Not interfere with each other
4. Improve development workflow

**Estimated test time**: 15 minutes
**Expected outcome**: All 5 features pass ✅

---

**Next Step**: Restart Claude Code and run through this test plan!
