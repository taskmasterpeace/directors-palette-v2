End of session safety check. Run this before ending any Claude Code session.

Steps:
1. Run `git status` to check for uncommitted changes
2. If any changes exist:
   - Stage them with `git add -A`
   - Commit with descriptive message
   - Push to origin main
3. Verify Vercel deployment status
4. Report final status to user

NEVER end a session with uncommitted work!
