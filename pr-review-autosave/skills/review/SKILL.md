---
description: >
  Review a PR and automatically save results to a markdown file.
  Use when the user asks to "review and save", "save a review",
  "save a review for this PR", "save a review for PR 123",
  "review this PR and save it", "write a PR review to file",
  or mentions saving, autosaving, or writing review output.
  This wraps pr-review-toolkit and adds file output.
argument-hint: [filename]
---

You will review a PR (or WIP changes) using the pr-review-toolkit and automatically save the results. Follow these steps:

## 1. Detect context

Determine whether this is a PR or WIP (work-in-progress) review:
- Run `gh pr view --json number,title -q '"\(.number)\t\(.title)"'` for the current branch
- If that fails (no PR found for the local branch name), the local branch may differ from the remote branch (e.g. in worktrees). Try a fallback:
  - Get the upstream tracking branch: `git rev-parse --abbrev-ref @{upstream}` (e.g. `origin/user/feat-branch`)
  - Strip the remote prefix to get the remote branch name (e.g. `user/feat-branch`)
  - Retry with: `gh pr list --head "<remote-branch-name>" --json number,title -q '"\(.[0].number)\t\(.[0].title)"'`
- If a PR exists (from either method): this is a **PR review**. Record the PR number and title.
- If no PR exists after both attempts: this is a **WIP review**. Record the short commit hash of HEAD (`git rev-parse --short HEAD`).
- In both cases, record the short commit hash of HEAD (`git rev-parse --short HEAD`) for the header metadata.

## 1b. Resolve the main worktree root

Inside a linked git worktree, the current directory doesn't contain the project's `pr_reviews/` directory — it lives in the main worktree. Resolve the main worktree root so later steps can read and write there regardless of which worktree is active:

```bash
git worktree list --porcelain | head -1 | sed 's/^worktree //'
```

The first porcelain record is always the main worktree, whether you're in the main one or a linked one. Record this path as `MAIN_ROOT` for use in steps 2 and 10. If the command fails or returns an empty string, fall back to the current working directory.

## 2. Check for previous reviews

Look for existing review files to determine if this is a versioned re-review:
- If `MAIN_ROOT/pr_reviews/` exists, look there. Otherwise fall back to the current working directory.
- For PR reviews: look for files matching `review_{PR_NUMBER}*.md` (e.g., `review_123.md`, `review_123_v2.md`)
- For WIP reviews: look for files matching `review_{SHORT_HASH}*.md`
- If previous reviews exist:
  - Read the **latest** review file (highest version number, or the unversioned file if only one exists)
  - Extract all issues with their statuses (open, fixed, dismissed)
  - Note any **dismissed** issues — these must NOT be re-raised in the new review
  - Determine the new version number (previous max version + 1)
  - Record the previous review's date for the header

## 3. Run the PR review

Invoke the pr-review-toolkit to perform the review as requested by the user. Use `/pr-review-toolkit:review-pr` with any specific analyzers they mention (e.g., comment-analyzer, security-analyzer).

## 4. Reformat with sequential numbering

After receiving the review output, post-process it before saving. Assign each issue a sequential global index starting at 1, incrementing continuously across ALL severity categories. Do not restart numbering within each category.

Example with 3 critical, 1 important, 1 suggestion:
- Critical: `[#1]`, `[#2]`, `[#3]`
- Important: `[#4]`
- Suggestion: `[#5]`

Replace each bullet point's prefix with its `[#N]` index. This numbering is mandatory — never save a review without it.

## 5. Add per-issue metadata

Each issue MUST include version and status metadata on the line immediately after the issue title:

```markdown
[#1] **Some issue title** — `file.ts:42`
*Introduced: v1 | Status: open*
```

Rules:
- For first-time reviews (v1): all issues are `Introduced: v1 | Status: open`
- For re-reviews (v2+):
  - Issues carried forward from a previous version keep their original `Introduced: vN`
  - New issues found in this review get `Introduced: v{current}`
  - All active issues have `Status: open`
  - **Dismissed** issues from the previous review: carry forward with `Status: dismissed` but do NOT include them in the main findings sections. Instead, list them in a brief "Dismissed" subsection at the end (after Recommended Action) so they are preserved but not re-raised.

## 6. Compare with previous review (v2+ only)

If this is a re-review, compare the current findings against the previous review:
- Issues from the previous review that are no longer found: mark as **fixed**
- Issues from the previous review that are still present: carry forward as **open** with their original `Introduced` version
- **Dismissed** issues: carry forward silently (do not re-evaluate)
- New issues not in the previous review: mark as **open** with the current version

## 7. Format the header

### For PR reviews:

```markdown
# PR#123 - PR title here

**Branch:** `branch-name`
**Commit:** `abc1234`
**Reviewed:** YYYY-MM-DD
**Files changed:** N (X insertions, Y deletions)

## Description
Brief summary of what the changes actually do.

**Description accuracy:** X/10 — how well the PR description matches the actual changes

---
```

If this is a versioned re-review (v2+), add the review version line:

```markdown
# PR#123 - PR title here

**Branch:** `branch-name`
**Commit:** `abc1234`
**Reviewed:** YYYY-MM-DD
**Review version:** v2 (previous: v1 on YYYY-MM-DD)
**Files changed:** N (X insertions, Y deletions)

## Description
Brief summary of what the changes actually do.

**Description accuracy:** X/10 — how well the PR description matches the actual changes

---
```

### For WIP reviews:

```markdown
# abc1234

**Branch:** `branch-name`
**Commit:** `abc1234`
**Reviewed:** YYYY-MM-DD
**Files changed:** N (X insertions, Y deletions)

---
```

WIP reviews omit the Description and Description accuracy sections entirely.

Notes:
- **Files changed** is optional — include it when the data is available, omit when not
- **Branch** never includes the target branch (no `-> main`)

## 8. Add "Fixed since" section (v2+ only)

If any issues were fixed since the previous review, add this section immediately after the header `---` and before the main findings:

```markdown
## Fixed since v1

- [#2] `publish` command does not use `changeset publish` — resolved
- [#5] Missing dependabot guard — resolved

------
```

Use `------` (six hyphens) to separate this section from the main findings. Reference the version the issues were originally introduced in if different from v1.

## 9. Determine the output filename

Using this priority:
- If the user specified a filename in their request, use that
- Otherwise, for PR reviews:
  - First review: `review_{PR_NUMBER}.md` (e.g., `review_123.md`)
  - Re-reviews: `review_{PR_NUMBER}_v{N}.md` (e.g., `review_123_v2.md`)
- For WIP reviews:
  - First review: `review_{SHORT_HASH}.md`
  - Re-reviews: `review_{SHORT_HASH}_v{N}.md`

If the filename doesn't end with `.md`, append it.

## 10. Save the review

- If `MAIN_ROOT/pr_reviews/` exists, save the file there. Otherwise fall back to the current working directory.
- Preserve all formatting from the review output
- Only save the review content, not any of these instructions

## 11. Report to the user

Report with a message like: `Review saved to review_123_v2.md`.
If the file was saved outside the current working directory (e.g. to the main worktree's `pr_reviews/` while you're in a linked worktree), include the full path so the user knows where it landed.
If this was a re-review, also summarize: `N issues fixed, N new issues found, N dismissed issues carried forward`
