# PR Review Autosave Plugin

Automatically saves PR review results to markdown files.

## Usage

Basic usage (auto-detects the PR for the current branch):
```
/pr-review-autosave:review
```

With specific analyzers:
```
/pr-review-autosave:review comment-analyzer security-analyzer
```

Save to a custom filename:
```
/pr-review-autosave:review my_review.md
```

## Reviewing a PR you are not checked out on

The skill above assumes you are already in a checkout of the branch under review. To review an arbitrary PR from anywhere — including from `claude agents` — use the agent instead:

From `claude agents` (agent view), mention it in the dispatch prompt:

```
@pr-review-worktree review PR 123
```

From inside a normal session, use the `@agent-` prefix with the plugin-scoped name:

```
@agent-pr-review-autosave:pr-review-worktree review PR 123
```

In both cases prefer the `@` typeahead over typing the name by hand — it inserts the form that context expects.

It fetches the PR head, creates a worktree for it under `.claude/worktrees/pr-123`, runs the review there, and saves the result to the main checkout. Your current branch and working tree are left untouched.

In agent view a mentioned agent runs as the session's main agent rather than as a subagent, so it retains the `Agent` tool and can spawn the `pr-review-toolkit` sub-agents that `review-pr` orchestrates. A subagent would have that tool stripped and could not fan out.

The agent never commits, pushes, opens a pull request, or posts the review to GitHub — output is the local markdown file only.

## What it does

1. Determines what is under review. An explicitly supplied PR number always wins. Otherwise it tries `gh pr view` for the current branch, then falls back to `gh pr list --head` against the upstream tracking branch — which is what makes detection work in a worktree whose local branch name differs from the remote one. If no PR is found, it runs a **WIP review** keyed on the short commit hash of `HEAD`.
2. Looks for previous reviews of the same PR or commit and reads the most recent one, so this run can be versioned against it.
3. Runs `pr-review-toolkit:review-pr`, which orchestrates its sub-agents based on what changed.
4. Reformats the output: sequential `[#N]` numbering running continuously across all severity sections, and per-issue `Introduced` / `Status` / `Files` metadata.
5. On a re-review, diffs against the previous version — issues that are gone are listed under a "Fixed since vN" heading, and issues you dismissed are carried forward without being raised again.
6. Saves the result and reports where it landed.

### Where reviews are saved

If a `pr_reviews/` directory exists, reviews go there; otherwise they land in the current directory. The directory is resolved against the **main** worktree root, so reviews run from a linked worktree still collect in one place.

### Output filenames

| Situation | Filename |
|-----------|----------|
| PR review | `review_{PR_NUMBER}.md` |
| PR re-review | `review_{PR_NUMBER}_v{N}.md` |
| WIP review (no PR) | `review_{SHORT_HASH}.md` |
| WIP re-review | `review_{SHORT_HASH}_v{N}.md` |

A filename passed as an argument overrides all of these.

## Dependencies

Requires the `pr-review-toolkit` plugin from Anthropic's `claude-plugins-official` marketplace. Add both marketplaces:

```
/plugin marketplace add catsby/claude-plugins
/plugin marketplace add anthropics/claude-plugins-official
```

Or declare them in your settings:

```json
"extraKnownMarketplaces": {
  "catsby-claude": {
    "source": { "source": "github", "repo": "catsby/claude-plugins" }
  },
  "claude-plugins-official": {
    "source": { "source": "github", "repo": "anthropics/claude-plugins-official" }
  }
}
```

## Installation

Enable both plugins in your `~/.claude/settings.json`:

```json
"enabledPlugins": {
  "pr-review-autosave@catsby-claude": true,
  "pr-review-toolkit@claude-plugins-official": true
}
```
