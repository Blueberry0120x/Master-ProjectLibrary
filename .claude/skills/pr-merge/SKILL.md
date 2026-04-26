---
name: pr-merge
description: Create PR from current branch, merge to main, and trigger post-merge pipeline (rebuild + deploy + phone notification). One-shot command for the full merge cycle.
user_invocable: true
---

Automated PR create + merge + deploy cycle. Runs the full pipeline from feature branch to main with phone notification.

## Arguments

- `$ARGUMENTS` — optional: PR title override, or "dry-run" to preview without merging

## Procedure

### Step 1: Pre-flight checks

Before anything, verify:
1. Current branch is NOT `main` (never push directly)
2. Working tree is clean (no uncommitted changes) — if dirty, commit first
3. All changes are pushed to remote
4. Build passes: `python tools/build.py` — if it fails, fix and re-commit

### Step 2: Create PR

Use the GitHub MCP tool to create the PR:

```
mcp__github__create_pull_request(
  owner: "Blueberry0120x",
  repo: "ProjectBook-Planner",
  title: <from branch name or $ARGUMENTS>,
  body: "## Summary\n<bullet points from commits>\n\n## Auto-merge\nThis PR will be auto-merged after Copilot review.",
  head: <current branch>,
  base: "main"
)
```

**Title rules:**
- Under 70 characters
- Format: `fix:`, `feat:`, `enforce:`, `build:` prefix matching commit style
- If $ARGUMENTS provides a title, use it

### Step 3: Request Copilot Review

Immediately request a GitHub Copilot code review:

```
mcp__github__request_copilot_review(
  owner: "Blueberry0120x",
  repo: "ProjectBook-Planner",
  pullNumber: <from step 2>
)
```

This triggers GitHub's built-in AI code review. Copilot will post inline comments on the PR if it finds issues.

### Step 4: Read Copilot Review

Wait ~15 seconds, then read the PR review status:

```
mcp__github__pull_request_read(
  owner: "Blueberry0120x",
  repo: "ProjectBook-Planner",
  pullNumber: <from step 2>
)
```

**Decision tree:**
- **Copilot approved or no blocking comments:** proceed to merge (Step 5)
- **Copilot flagged issues:** report findings to designer. Fix if trivial, ask if architectural. Re-push and re-request review.
- **Review still pending after 30s:** proceed to merge anyway (Copilot review is advisory, not blocking)

### Step 5: Merge PR

Merge using:

```
mcp__github__merge_pull_request(
  owner: "Blueberry0120x",
  repo: "ProjectBook-Planner",
  pullNumber: <from step 2>,
  merge_method: "squash"
)
```

**Merge method:** `squash` for feature branches (clean single commit on main), `merge` for long-lived branches with important commit history.

### Step 6: Post-merge pipeline (automatic)

After merge to main, GitHub Actions fires automatically:
1. **post-merge.yml** — rebuilds Output HTML, commits if changed, posts summary comment
2. **mirror-public.yml** — mirrors to ParcelDashboard gh-pages (public site)
3. **notify-controller.yml** — notifies NP_ClaudeAgent if controller-note/ changed

The PR comment from post-merge.yml triggers a **GitHub mobile push notification** to the designer's phone.

### Step 7: Report

Output to user:
- PR URL
- Merge status
- Which workflows triggered
- Public site URL if mirror ran: https://blueberry0120x.github.io/ParcelDashboard/

## Dry Run

If `$ARGUMENTS` contains "dry-run":
- Show what the PR title/body would be
- Show which files would be included
- Show commit count
- Do NOT create or merge anything

## Error Handling

| Error | Action |
|---|---|
| Merge conflict | Report conflicting files, do NOT force-merge. Ask designer to resolve. |
| CI check failing | Wait up to 60s, retry once. If still failing, report and ask. |
| Branch behind main | Run `git pull origin main --rebase` first, re-push, then create PR. |
| No changes vs main | Skip PR creation, report "branch is up to date with main". |

## Rules

- NEVER push directly to main — always PR + merge
- ALWAYS squash-merge feature branches (clean history)
- NEVER merge with failing build — run build.py first
- Post-merge workflows handle rebuild/deploy — agent does NOT need to rebuild after merge
- Phone notification comes from GitHub mobile app via the PR comment
