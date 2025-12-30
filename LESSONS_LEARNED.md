# LESSONS LEARNED: Critical Deployment Incident - December 16, 2024

## Incident Summary

**What happened:** 194 files containing major features (27,881 lines of code) existed only on the local machine and were never committed to Git. Production was running an old version missing:
- Sidebar Navigation
- Recipes feature
- Help/User Manual
- Community features
- Coupons system
- API Keys
- Director enhancements
- And many more

**Duration:** Unknown - potentially 2-3 weeks of development was at risk

**Root Cause:** Code was developed but never committed or pushed to the repository

---

## What Went Wrong

### 1. No Commit Discipline
- Features were developed across multiple sessions without committing
- Large amounts of work accumulated without being saved to Git
- No regular commit checkpoints

### 2. No Deployment Verification
- After making changes, production was never verified
- Assumed local changes were reflected in production
- No staging environment for testing

### 3. Session Context Loss
- When Claude Code sessions ended, context about uncommitted work was lost
- No handoff document existed to track pending commits
- Each session started fresh without knowledge of prior uncommitted work

### 4. No Git Status Checks
- `git status` was not run at session start/end
- Uncommitted changes accumulated silently
- No warnings about untracked files

---

## Immediate Actions Taken

1. **Emergency Commit** - All 194 files committed immediately
2. **Push to Production** - Deployed all features to production
3. **Documentation** - Created this lessons learned document
4. **CLAUDE.md Update** - Added mandatory commit rules

---

## Prevention Measures (MANDATORY)

### For Claude Code (AI Assistant)

1. **Session Start Protocol**
   - Run `git status` at the start of EVERY session
   - Report any uncommitted changes to user
   - Do not proceed until user acknowledges

2. **Commit After Every Feature**
   - NEVER end a feature without committing
   - Commit in small, logical chunks
   - Push after every significant change

3. **Session End Protocol**
   - Run `git status` before ending
   - If uncommitted changes exist, WARN USER LOUDLY
   - Create summary of pending work

4. **Daily Commit Rule**
   - If session spans significant work, commit periodically
   - Never let more than 1 hour of work go uncommitted
   - Use descriptive commit messages

### For Human Developers

1. **Check Git Status Regularly**
   ```bash
   git status
   ```

2. **Commit Often**
   - Small, focused commits
   - Descriptive messages
   - Push after each commit

3. **Verify Deployments**
   - After pushing, verify production
   - Check Vercel deployment status
   - Test key features

4. **Session Handoffs**
   - Document what was done
   - Document what needs to be committed
   - Leave notes for future sessions

---

## New CLAUDE.md Rules Added

```markdown
# CRITICAL: Git Commit Protocol

## At Session Start
1. ALWAYS run `git status` first
2. Report any uncommitted changes
3. Commit existing work before starting new features

## During Development
1. Commit after completing each feature
2. Never let more than 1 hour of work go uncommitted
3. Use descriptive commit messages

## At Session End
1. Run `git status`
2. Commit all changes
3. Push to remote
4. Verify deployment

## NEVER
- Leave uncommitted changes overnight
- Start new features with uncommitted work
- End sessions with uncommitted code
```

---

## Verification Checklist

After any development session:

- [ ] `git status` shows no uncommitted changes
- [ ] All new files are tracked
- [ ] Changes are pushed to remote
- [ ] Production deployment completed
- [ ] Key features verified on production

---

## Technical Details

### Files That Were At Risk
- 86 untracked files (never seen by Git)
- 65+ modified files (changes not staged)
- 6 new database migrations
- 12 new feature modules
- 20+ new components

### Recovery Actions
1. Removed invalid `nul` file
2. Staged all changes with `git add -A`
3. Created comprehensive commit
4. Pushed to origin/main
5. Verified Vercel deployment

---

## Recommendations

1. **Consider Git Hooks**
   - Pre-commit hooks to run tests
   - Post-commit hooks to verify

2. **Consider CI/CD Improvements**
   - Automated deployment verification
   - Slack/Discord notifications on deploy

3. **Consider Session Markers**
   - `.claude-session` file tracking current work
   - Automatic commit reminders

4. **Consider Backup Strategy**
   - Regular local backups
   - Cloud sync for work in progress

---

## Conclusion

This incident could have resulted in weeks of lost work. The only reason recovery was possible is because the local files still existed. If the computer had been wiped or files deleted, this work would have been permanently lost.

**COMMIT EARLY. COMMIT OFTEN. PUSH ALWAYS.**

---

*Document created: December 16, 2024*
*Incident resolved: December 16, 2024*
*Author: Claude Code with Human Oversight*

---

# LESSON: Claude Code Statusline Setup - December 30, 2024

## What We Wanted
A statusline showing current folder and git branch in Claude Code.

## What Went Wrong (Multiple Times)
1. **JSON parsing failures** - Tried parsing Claude's JSON input with `jq` and `grep/sed` - unreliable
2. **jq not working** - Windows had npm-based jq wrapper that was broken
3. **Line ending corruption** - Windows CRLF caused garbled output like `| maintors-palette-v2`
4. **Inconsistent output** - Sometimes showed folder, sometimes branch, sometimes nothing

## The Fix

### Simple statusline script (no JSON parsing needed!)
```bash
#!/bin/bash
DIR=$(basename "$(pwd)")
BRANCH=$(git branch --show-current 2>/dev/null)
echo "📁 $DIR | 🌿 $BRANCH"
```

**Key insight**: The script runs in the project directory context, so `pwd` works directly. No need to parse JSON.

### Settings configuration
In `.claude/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "bash .claude/statusline.sh"
  }
}
```

### Prevent CRLF corruption
Add to `.gitattributes`:
```
*.sh text eol=lf
```

## Setup Checklist

- [ ] Create `.claude/statusline.sh` with the script above
- [ ] Ensure Unix line endings (LF, not CRLF)
- [ ] Add `*.sh text eol=lf` to `.gitattributes`
- [ ] Configure in `.claude/settings.json`
- [ ] **Restart Claude Code** for changes to take effect

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Nothing shows | Restart Claude Code |
| Garbled output | Fix line endings: `sed -i 's/\r$//' .claude/statusline.sh` |
| Only branch shows | Check `pwd` works in Git Bash |
| Only folder shows | Check `git branch --show-current` works |

## Reference
- cc-statusline project: https://github.com/chongdashu/cc-statusline
- Our simplified version doesn't need jq or JSON parsing

---

*Lesson added: December 30, 2024*
