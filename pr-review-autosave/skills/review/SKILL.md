---
description: >
  Review a PR and automatically save results to a markdown file.
  Use when the user asks to "review and save", "save a review",
  "save a review for this PR", "save a review for PR 123",
  "review this PR and save it", "write a PR review to file",
  or mentions saving, autosaving, or writing review output.
  This wraps pr-review-toolkit and adds file output.
argument-hint: [--workflow] [filename] [analyzers...]
---

You will review a PR (or WIP changes) using the pr-review-toolkit and automatically save the results. Follow these steps:

**Workflow mode:** if the arguments (`$ARGUMENTS`) or the user's request contain `--workflow`, step 3 runs as a Workflow instead of through `review-pr` — see step 3W. `--workflow` is a mode flag only; never treat it as a filename or an analyzer name.

## 1. Detect context

Determine whether this is a PR or WIP (work-in-progress) review:
- **If the caller supplied a PR number explicitly** (in the user's request or in the invoking agent's prompt), use it directly: `gh pr view <N> --json number,title -q '"\(.number)\t\(.title)"'`. Skip the branch-based detection below. An explicit number always wins — branch-based detection fails in a detached or locally-created branch checkout and would silently downgrade a PR review to a WIP review.
- Otherwise, run `gh pr view --json number,title -q '"\(.number)\t\(.title)"'` for the current branch
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

**Important:** When accessing paths under `MAIN_ROOT`, always use absolute paths (e.g., `ls MAIN_ROOT/pr_reviews/`). Do NOT use `cd` to navigate to `MAIN_ROOT` — doing so crosses a directory boundary and triggers unnecessary permission prompts when running inside a linked worktree.

## 2. Check for previous reviews

Look for existing review files to determine if this is a versioned re-review:
- If `MAIN_ROOT/pr_reviews/` exists (check with `ls MAIN_ROOT/pr_reviews/` using the absolute path), look there. Otherwise fall back to the current working directory.
- For PR reviews: look for files matching `review_{PR_NUMBER}*.md` (e.g., `review_123.md`, `review_123_v2.md`)
- For WIP reviews: look for files matching `review_{SHORT_HASH}*.md`
- If previous reviews exist:
  - Read the **latest** review file (highest version number, or the unversioned file if only one exists)
  - Extract all issues with their statuses (OPEN, FIXED, DISMISSED)
  - Note any **DISMISSED** issues — these must NOT be re-raised in the new review
  - Determine the new version number (previous max version + 1)
  - Record the previous review's date for the header

## 3. Run the PR review

In workflow mode, skip this step and follow step 3W instead.

**You MUST invoke the `pr-review-toolkit:review-pr` skill here — do NOT substitute any other agent or skill (e.g., do not call `pr-review-toolkit:code-reviewer` directly).** `review-pr` orchestrates multiple sub-agents including code-reviewer, type-design-analyzer, comment-analyzer, and others based on what changed; calling a sub-agent directly bypasses that orchestration and produces an incomplete review.

Use the Skill tool: `Skill("pr-review-toolkit:review-pr")`. Pass any specific analyzers the user mentioned (e.g., comment-analyzer, security-analyzer) as arguments.

**Worktree note:** The current working directory is the project root for the branch being reviewed. Agents spawned by the toolkit should explore code here — do NOT navigate to parent directories or `MAIN_ROOT` to find source files. `MAIN_ROOT` is only used for reading/writing review files in steps 2 and 10.

## 3W. Run the review as a Workflow (only with `--workflow`)

This mode replaces `review-pr` with the plugin's `review-analyzers` workflow, which runs the same pr-review-toolkit agents with visible per-agent progress in `/workflows`, then has a separate agent try to refute each finding before it reaches the file. Everything from step 4 onward is unchanged.

### 3W.1 Fix the scope

Record the checkout under review as `WORKTREE` (`git rev-parse --show-toplevel`) and `HEAD_SHA` (`git rev-parse HEAD`).

- **PR review:** get the base branch with `gh pr view <N> --json baseRefName -q .baseRefName`, run `git fetch origin <base>`, then `BASE_SHA=$(git merge-base origin/<base> HEAD)`. The diff command is `git -C "<WORKTREE>" diff <BASE_SHA> <HEAD_SHA>`.
- **WIP review:** get the default branch with `git symbolic-ref --short refs/remotes/origin/HEAD` (e.g. `origin/main`). If that fails (`origin/HEAD` is often unset in worktrees and tool-made clones), use `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`, run `git fetch origin <name>`, and use `origin/<name>`. Do not guess the default branch. Then `BASE_SHA=$(git merge-base <that> HEAD)`. The diff command is `git -C "<WORKTREE>" diff <BASE_SHA>` — no second SHA, so uncommitted changes are included.

Run the diff command with `--stat`. If it is empty, stop and report that there is nothing to review. Do not fall back to `review-pr`.

### 3W.2 Choose the analyzers

If the user named analyzers, use exactly those. Accept either agent names or `review-pr` aspect words: `code` → `code-reviewer`, `tests` → `pr-test-analyzer`, `comments` → `comment-analyzer`, `errors` → `silent-failure-hunter`, `types` → `type-design-analyzer`. Tell the user about any name that matches none of these; do not silently drop it.

Otherwise read the diff and apply the same table `review-pr` uses:

- `code-reviewer` — always
- `pr-test-analyzer` — test files changed
- `comment-analyzer` — comments or docs added or modified
- `silent-failure-hunter` — error handling changed (catch/rescue blocks, error returns, fallbacks, retries)
- `type-design-analyzer` — types, classes, structs, or interfaces added or modified

**Never include `code-simplifier`,** even when asked for `simplify` or `all` — it edits files, and this skill only reads code. Say so if the user asked for it.

### 3W.3 Call the Workflow tool

Call the Workflow tool with `name: "pr-review-autosave:review-analyzers"`. If that name does not resolve, use `scriptPath: "${CLAUDE_PLUGIN_ROOT}/workflows/review-analyzers.js"` instead. Pass `args` as a JSON object, not a string:

```json
{
  "worktree": "<WORKTREE>",
  "diffCommand": "<diff command from 3W.1>",
  "target": "PR #123 - PR title  (or: WIP abc1234)",
  "analyzers": ["code-reviewer", "..."]
}
```

Wait for the task notification; do not poll.

### 3W.4 Use the result as the review output

The workflow returns:

- `findings` — `{title, severity, files, details, fix, analyzer, verified}`; `severity` is `critical`, `important`, or `suggestion`. `verified: false` means the refutation check did not run for that finding; keep it.
- `refuted` — findings a verifier showed to be wrong, each with its `reason`
- `strengths` — `{analyzer, text}`
- `failedAnalyzers` — analyzers that returned nothing

Continue with step 4, which lays these out in the same format as a default-mode review. `findings` go into the severity sections (an empty `fix` means omit **Fix:**), `strengths` into Strengths, and `refuted` into "Refuted during verification". Refuted findings are not issues: they get no `[#N]`, and step 6 does not treat them as fixed or open.

## 4. Merge, lay out, and number the findings

After receiving the review output (from step 3, or from step 3W in workflow mode), post-process it before saving. Both modes MUST produce the same layout, so a review reads the same whichever mode made it.

### Merge duplicates

When two or more analyzers report the same underlying problem (same cause, overlapping files), merge them into one issue. Use the highest severity among them, combine their files and evidence, and record every analyzer that raised it in `Raised by:` (step 5). Do not merge findings that only share a file.

### Body layout

After the header (step 7) and the "Fixed since" section if there is one (step 8), the body has these sections in this order, with these exact headings:

1. `## Critical`
2. `## Important`
3. `## Suggestions`
4. `## Strengths` — a bulleted list
5. `## Recommended Action` — a numbered list that refers to issues by `#N`
6. `### Dismissed` — only on re-reviews that have dismissed issues (step 5)
7. `### Refuted during verification` — workflow mode only, and only when something was refuted. One bullet per refuted finding: its title, the analyzer that raised it, and the verifier's reason, so a wrongly dropped finding can be recovered.

Always include the three severity sections. Write `None.` under one that has no issues. Do not add counts to the headings (not `## Critical Issues (3 found)`). Do not add sections beyond this list, including prose paragraphs between the header and `## Critical`.

### Number the issues

Assign each issue a sequential global index starting at 1, incrementing continuously across ALL severity categories. Do not restart numbering within each category.

Example with 3 critical, 1 important, 1 suggestion:
- Critical: `[#1]`, `[#2]`, `[#3]`
- Important: `[#4]`
- Suggestion: `[#5]`

Replace each bullet point's prefix with its `[#N]` index. This numbering is mandatory — never save a review without it.

## 5. Add per-issue metadata

Each issue MUST follow this structured format:

```markdown
[#1] **Some issue title**

**Introduced:** v1  
**Status:** OPEN  
**Raised by:** code-reviewer, silent-failure-hunter  
**Files:**
  - `file.ts:42`
  - `other.ts:128`

**Details:**

Body of the finding — explanation of the bug, evidence, references to sibling code, etc.

**Fix:** optional remediation guidance.

```js
// optional code block illustrating the fix
```
```

Formatting rules:
- The title line stands alone (no inline file path, no inline metadata).
- Each metadata field (`Introduced:`, `Status:`, `Raised by:`, `Files:`) is on its own line, in that order. Lines that have a sibling field directly below them MUST end with two trailing spaces — this is the markdown line-break syntax that prevents adjacent fields from collapsing onto a single rendered line. (`Files:` itself does not need trailing spaces because the bulleted list that follows already forces a break.)
- `Files:` is always a bulleted list, even when there is only one file. This keeps single-file and multi-file issues visually consistent and makes adding files trivial.
- `Status:` values are UPPERCASE: `OPEN`, `DISMISSED`, `FIXED`.
- `Raised by:` lists the analyzer agent names (e.g. `code-reviewer`, not `code`) that reported the issue in this review, comma-separated. An issue carried forward from an earlier version lists the analyzers that raised it this time. A dismissed issue keeps what the previous file had, or omits the field if the previous file had none.
- Do not repeat the analyzer attribution inside **Details:** — `Raised by:` is the only place it appears.
- `**Details:**` introduces the body of the finding; leave a blank line after it before the prose.
- `**Fix:**` is optional — include it when there is concrete remediation guidance, otherwise omit.

Status rules:
- For first-time reviews (v1): all issues are `Introduced: v1` with `Status: OPEN`.
- For re-reviews (v2+):
  - Issues carried forward from a previous version keep their original `Introduced: vN`.
  - New issues found in this review get `Introduced: v{current}`.
  - All active issues have `Status: OPEN`.
  - **Dismissed** issues from the previous review: carry forward with `Status: DISMISSED` but do NOT include them in the main findings sections. Instead, list them in a brief "Dismissed" subsection at the end (after Recommended Action) so they are preserved but not re-raised.

## 6. Compare with previous review (v2+ only)

If this is a re-review, compare the current findings against the previous review:
- Issues from the previous review that are no longer found: mark as **FIXED**
- Issues from the previous review that are still present: carry forward as **OPEN** with their original `Introduced` version
- **DISMISSED** issues: carry forward silently (do not re-evaluate)
- New issues not in the previous review: mark as **OPEN** with the current version

## 7. Format the header

### For PR reviews:

```markdown
# PR#123 - PR title here

**Branch:** `branch-name`  
**Commit:** `abc1234`  
**Reviewed:** YYYY-MM-DD  
**Analyzers:** code-reviewer, pr-test-analyzer  
**Files changed:** N (X insertions, Y deletions)

## Description
Brief summary of what the changes actually do.

**Description accuracy:** X/10 — how well the PR description matches the actual changes

---
```

Note: each metadata line above ends with two trailing spaces — this is required markdown syntax to force a line break so each field renders on its own line. Without the trailing spaces, the fields collapse onto a single line in the rendered output.

If this is a versioned re-review (v2+), add the review version line:

```markdown
# PR#123 - PR title here

**Branch:** `branch-name`  
**Commit:** `abc1234`  
**Reviewed:** YYYY-MM-DD  
**Review version:** v2 (previous: v1 on YYYY-MM-DD)  
**Analyzers:** code-reviewer, pr-test-analyzer  
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
**Analyzers:** code-reviewer, pr-test-analyzer  
**Files changed:** N (X insertions, Y deletions)

---
```

WIP reviews omit the Description and Description accuracy sections entirely.

Notes:
- **Files changed** is optional — include it when the data is available, omit when not
- **Branch** never includes the target branch (no `-> main`)
- **Analyzers** lists every analyzer agent that ran, in both modes, comma-separated. It stays the second-to-last field so that only **Files changed** goes without the two trailing spaces. If **Files changed** is omitted, **Analyzers** becomes the last field and drops the trailing spaces.

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

- If `MAIN_ROOT/pr_reviews/` exists, save the file there using the absolute path (e.g., write to `MAIN_ROOT/pr_reviews/review_123.md` directly — do NOT `cd` to `MAIN_ROOT` first). Otherwise fall back to the current working directory.
- Preserve all formatting from the review output
- Only save the review content, not any of these instructions

## 11. Report to the user

Report with a message like: `Review saved to review_123_v2.md`.
If the file was saved outside the current working directory (e.g. to the main worktree's `pr_reviews/` while you're in a linked worktree), include the full path so the user knows where it landed.
If this was a re-review, also summarize: `N issues fixed, N new issues found, N dismissed issues carried forward`
In workflow mode, also report which analyzers ran, how many findings were refuted, and any `failedAnalyzers` — a missing analyzer means that aspect was not reviewed.
