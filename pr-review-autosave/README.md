# PR Review Autosave Plugin

Automatically saves PR review results to markdown files.

## Usage

Basic usage (auto-detects PR number):
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

1. Runs pr-review-toolkit to review the PR
2. Detects the PR number via `gh pr view`
3. Saves output to `review_{PR_NUMBER}.md`
4. Falls back to `review_{branch_name}.md` if no PR exists for the branch

## Dependencies

Requires the `pr-review-toolkit` plugin from the `claude-code-plugins` marketplace. Add both marketplaces to your Claude Code settings:

```json
"pluginMarketplaces": [
  "https://github.com/catsby/claude-plugins",
  "https://github.com/anthropics/claude-plugins-official"
]
```

## Installation

Enable both plugins in your `~/.claude/settings.json`:

```json
"enabledPlugins": {
  "pr-review-autosave@catsby-claude": true,
  "pr-review-toolkit@claude-code-plugins": true
}
```
