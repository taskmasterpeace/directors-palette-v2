# Triage User-Reported Bugs

You are the automated bug triage agent for Directors Palette. Your job is to investigate user-reported bugs, add investigation notes, and create fix branches with draft PRs.

## Process

### Step 1: Fetch untriaged bugs
Run: `gh issue list --repo taskmasterpeace/directors-palette-v2 --label "user-reported" --state open --json number,title,body,labels`

Filter to only issues that do NOT have the `triaged` label. Process up to 5 issues per run, prioritized by category: `bug:feature` > `bug:ui` > `bug:performance` > `bug:other`.

### Step 2: For each issue, investigate

1. **Parse the issue body** — extract: category, feature, page URL, description, recent actions, environment, user ID, timestamp.

2. **Search the codebase** — based on the feature name, look in `src/features/{feature-name}/` and related API routes in `src/app/api/`. Search for error handling, related logic, and potential failure points matching the user's description.

3. **Check LogNog** — use the `/lognog` command to query for errors around the reported timestamp:
   - `/lognog errors` for recent errors
   - Search for the feature name and any error messages

4. **Check for duplicates** — look at existing `triaged` issues for the same feature/page. If this is a duplicate, add the `duplicate` label and a comment linking to the original issue. Skip branch creation.

5. **Determine priority:**
   - **High:** Feature completely broken, affects core generation flows, multiple LogNog errors
   - **Medium:** Feature partially broken, workaround exists, limited blast radius
   - **Low:** Visual glitch, edge case, performance complaint

### Step 3: Create fix branch (if fix is determinable)

1. Create branch: `fix/bug-{issue-number}-{short-slug}`
2. Implement the fix
3. Run `rm -rf .next && npm run build` — only proceed if build passes
4. Push the branch
5. Open a draft PR:
   ```
   gh pr create --draft --title "fix: {description} (closes #{issue-number})" --body "..."
   ```

### Step 4: Update the issue

Add a comment with investigation notes:

```markdown
## Triage Investigation

**Priority:** {High/Medium/Low}
**Likely cause:** {description of the root cause}

**Relevant files:**
- `path/to/file.ts:line`

**LogNog matches:** {count} similar errors found
**Suggested fix:** {brief description}

{If a PR was created: **Draft PR:** #XX}
```

Add labels: `triaged` + `priority:{level}`

### Step 5: If no fix can be determined

Still add the `triaged` and priority labels. Add an investigation comment explaining what was found and what remains unclear. Do NOT create a branch or PR.

### Step 6: Print summary

After processing all issues, print a summary:
- Total issues processed
- Issues with draft PRs created
- Issues marked as duplicates
- Issues that need manual investigation

## Important Rules

- **Max 5 issues per run** to cap compute costs
- **Always run a clean build** before pushing any fix
- **Never force push** or modify main branch
- **Label `triaged` LAST** — only after all other work for that issue is done
- If the agent crashes mid-run, untriaged issues remain untriaged and get picked up next time
