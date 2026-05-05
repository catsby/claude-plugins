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
