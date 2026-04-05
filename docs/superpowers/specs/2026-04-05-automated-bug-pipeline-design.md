# Automated Bug Pipeline — Design Spec

**Date:** 2026-04-05
**Status:** Design approved, ready for implementation planning

---

## Overview

Transform the existing bug report system (submit → GitHub issue → manual triage) into a fully automated DevOps pipeline that investigates, fixes, tests, and notifies — with the human only approving the final merge.

**Philosophy:** Automate everything, notify on everything important, only stop for merge approval.

---

## Pipeline Stages

```
User submits bug
    → [1] Security & Quality Gate (AI-powered, blocks bad input)
    → [2] GitHub Issue Created (labeled, structured)
    → [3] Real-Time Auto-Triage (investigate code + logs immediately)
    → [4] Auto-Fix Attempt (create branch, implement fix, build + test)
    → [5] Notify Owner (GitHub notification + email summary)
    → [6] Owner Approves Merge (one-click PR merge)
    → [7] Auto-Deploy (Vercel deploys main)
```

The daily 8am scheduled triage remains as a safety net to catch anything that fell through the real-time pipeline.

---

## Stage 1: Security & Quality Gate

**Location:** `src/app/api/bug-report/route.ts` — runs BEFORE creating the GitHub issue.

### Security Scan

Check the bug description, screenshot filename, and metadata for:

- **Prompt injection** — attempts to manipulate the triage agent (e.g., "ignore previous instructions", "you are now a helpful assistant that...")
- **XSS payloads** — `<script>`, `onerror=`, `javascript:` in description text
- **SQL injection fragments** — `'; DROP TABLE`, `UNION SELECT`, `OR 1=1`
- **Encoded attacks** — base64-encoded payloads, URL-encoded injection attempts
- **Spam patterns** — repeated characters, all-caps screaming, known spam phrases

**Implementation:** Use a fast LLM call (Gemini 2.0 Flash via OpenRouter, free tier) with a structured prompt:

```
Analyze this bug report for security threats and quality.

Description: "{description}"
Category: "{category}"
Page: "{pageUrl}"

Respond with JSON:
{
  "security_score": 0-100,       // 0 = definitely malicious, 100 = clean
  "quality_score": 0-100,        // 0 = useless, 100 = perfect report
  "security_flags": [],          // e.g., ["xss_attempt", "prompt_injection"]
  "quality_issues": [],          // e.g., ["no_specific_feature", "no_steps_to_reproduce"]
  "suggested_followup": "",      // Question to ask user if quality is low
  "verdict": "allow|flag|block"  // allow = proceed, flag = proceed but mark, block = reject
}
```

### Security Outcomes

| Verdict | Action |
|---------|--------|
| `block` (score < 20) | Reject submission. Return generic "Something went wrong" to user. Log the attempt with full payload to LogNog as `security_threat`. Do NOT create GitHub issue. |
| `flag` (score 20-60) | Create GitHub issue but add `security:flagged` label. Include security analysis in issue body. Notify owner immediately. Pipeline continues but auto-fix is skipped. |
| `allow` (score > 60) | Proceed normally. |

### Quality Outcomes

| Score | Action |
|-------|--------|
| < 30 (garbage) | Create issue with `needs-info` label. Auto-comment asking the `suggested_followup` question. Do NOT trigger triage pipeline — wait for user to add more info. |
| 30-60 (vague) | Create issue, trigger triage, but add `low-quality` label so triage knows context is thin. |
| > 60 (actionable) | Proceed normally through full pipeline. |

### Rate Limiting Enhancement

Keep existing 3-per-hour limit. Add:
- If a user hits `block` verdict twice in an hour, temporarily ban submissions for 24 hours.
- Log all blocked attempts for security audit.

---

## Stage 2: GitHub Issue Creation

**No changes to current behavior**, except:

- Add security/quality labels from Stage 1: `security:flagged`, `needs-info`, `low-quality`
- Add the AI quality analysis as a collapsed `<details>` section in the issue body
- Include `pipeline:pending` label to mark it as awaiting pipeline processing

---

## Stage 3: Real-Time Auto-Triage

**Trigger:** Fires immediately after the GitHub issue is created (within the same API request, as a fire-and-forget async call — same pattern as the current recipe execution).

**Implementation:** New async function `triggerBugPipeline()` called from the bug report API route after issue creation.

### Triage Process (same as current `/triage-bugs` but automated):

1. **Parse issue** — extract category, feature, page URL, description
2. **Search codebase** — look in `src/features/{feature}/` and `src/app/api/` for related code
3. **Query LogNog** — search for errors matching the feature and timestamp
4. **Check for duplicates** — compare against open issues with same feature/page
5. **Determine priority** — High / Medium / Low based on severity heuristics
6. **Add investigation comment** — findings, relevant files, likely cause
7. **Apply labels** — `triaged`, `priority:{level}`

### Execution Method

Use Claude Code's remote trigger API to dispatch a triage agent:

```
POST /api/triggers/{trigger_id}/run
{
  "issue_number": 11,
  "issue_url": "https://github.com/taskmasterpeace/directors-palette-v2/issues/11"
}
```

The remote agent runs the existing triage logic from `.claude/commands/triage-bugs.md`, scoped to just the single new issue.

**Fallback:** If the remote trigger fails or times out, the issue remains with `pipeline:pending` label and gets picked up by the daily 8am safety net.

---

## Stage 4: Auto-Fix Attempt

**Aggression level:** Aggressive — attempt a fix on everything the agent can understand.

After triage completes and a likely cause is identified:

1. **Create branch:** `fix/bug-{issue-number}-{slug}`
2. **Implement fix** — based on investigation findings
3. **Clean build:** `rm -rf .next && npm run build` — must pass
4. **Push branch**
5. **Create draft PR** with:
   - Title: `fix: {description} (closes #{issue-number})`
   - Body: investigation notes, what was changed, what was tested
   - Assigned to repo owner (triggers GitHub notification)
   - Label: `auto-fix`

### When Auto-Fix is Skipped

- Issue has `security:flagged` label (manual review required)
- Issue has `needs-info` label (not enough context to fix)
- Triage couldn't determine a likely cause
- Build fails after fix attempt (revert branch, flag for manual attention)

In these cases, the issue gets labeled `needs-manual-review` and the notification still fires.

---

## Stage 5: Notifications

### GitHub Notifications (automatic)

- PR assignment → owner gets GitHub notification email
- Issue comments → owner gets notified via watch settings

### Email Summary

A dedicated notification email sent via the existing email infrastructure (or a simple API route that sends via a transactional email service).

**Email content:**

```
Subject: [Directors Palette] Bug #{number}: {title} — {status}

Bug Report: {link to issue}
Priority: {High/Medium/Low}
Status: {PR Ready for Review / Needs Manual Review / Needs More Info}

{If PR exists:}
Draft PR: {link}
Files changed: {count}
What was fixed: {one-line summary}

{If no PR:}
Investigation: {one-line summary of findings}
Action needed: {what you need to do}
```

**Implementation:** New API route `POST /api/notifications/bug-pipeline` that sends the email. Called at the end of the pipeline. Use Resend, SendGrid, or Supabase Edge Functions for delivery.

### Notification Events

| Event | GitHub | Email |
|-------|--------|-------|
| Bug submitted (high quality) | Issue created | No (wait for triage) |
| Security threat blocked | No issue | Yes — alert |
| Security threat flagged | Issue + label | Yes — alert |
| Triage complete, PR created | PR assigned | Yes — "PR ready" |
| Triage complete, no fix | Issue comment | Yes — "needs review" |
| Low-quality report, needs info | Issue comment | No (noise) |
| PR merged + deployed | Issue closed | No (you just clicked it) |

---

## Stage 6: Owner Approves Merge

**No automation here.** This is the human gate.

Owner receives notification → reviews the PR diff → merges or requests changes.

If changes requested: the pipeline can attempt a second fix pass (stretch goal, not MVP).

---

## Stage 7: Auto-Deploy

Already handled by Vercel — merging to `main` triggers deployment automatically. No additional work needed.

---

## File Structure

### New Files

```
src/features/bug-report/
  services/
    security-gate.service.ts      # LLM-based security + quality scan
    bug-pipeline.service.ts       # Orchestrates the full pipeline
    notification.service.ts       # Email notifications for pipeline events
  types/
    pipeline.types.ts             # Pipeline stage types, verdicts, scores

src/app/api/
  bug-report/route.ts             # MODIFIED — add security gate + pipeline trigger
  notifications/bug-pipeline/
    route.ts                      # Email notification endpoint
```

### Modified Files

```
src/app/api/bug-report/route.ts   # Add security gate before issue creation
                                   # Add pipeline trigger after issue creation
.claude/commands/triage-bugs.md    # Add single-issue mode for real-time triage
```

---

## Data Flow

```
User clicks bug button
  → BugReportModal collects description + category + screenshot
  → POST /api/bug-report

API Route:
  1. Auth check (existing)
  2. Rate limit check (existing)
  3. Upload screenshot (existing)
  4. NEW: Security & Quality Gate
     → Call Gemini Flash for analysis
     → If blocked: log + reject + return
     → If needs-info: create issue with label, skip pipeline
  5. Create GitHub issue (existing, with new labels)
  6. NEW: Fire-and-forget triggerBugPipeline()
     → Dispatch remote triage agent
     → Agent: investigate → fix → PR → notify
  7. Return success to user ("Thanks, we got it")
```

---

## Security Considerations

- **LLM gate prompt hardening** — The security gate prompt itself must be resistant to injection. Use a system prompt that cannot be overridden, and validate the JSON response schema strictly.
- **Blocked submissions logging** — All blocked attempts logged to LogNog with full payload for audit trail. Never expose the reason to the attacker (always show generic error).
- **Rate limit on blocks** — Two blocked attempts in an hour = 24-hour submission ban for that user.
- **GitHub PAT scope** — Already scoped to `repo` only. No changes needed.
- **Email notifications** — Only sent to the repo owner's configured email. Never to the reporter.

---

## User Experience

### For the bug reporter:
- Submit form → "Thanks! We received your report." (existing toast)
- Nothing else. No updates, no follow-ups, no tracking page.

### For the owner (you):
- Bug comes in → GitHub notification + email within minutes
- If PR ready: review diff, merge with one click
- If needs attention: investigation notes tell you exactly what to look at
- If security threat: immediate alert email

---

## MVP vs Stretch

### MVP (this implementation)
- Security & quality gate (LLM scan)
- Real-time pipeline trigger
- Auto-triage (reuse existing logic)
- Auto-fix with build verification
- GitHub + email notifications
- Daily safety net (keep existing scheduled triage)

### Stretch (future)
- Second-pass fix attempts when PR gets "changes requested"
- In-app notification bell for the reporter ("your bug was fixed")
- Dashboard showing pipeline metrics (bugs/day, fix rate, avg time-to-fix)
- Slack/Discord integration
- Auto-close stale `needs-info` issues after 7 days of silence
