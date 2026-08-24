# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **Claude Code plugin marketplace** repository. It contains Claude Code plugins distributed via a marketplace manifest. There is no build system, no compiled code, no tests, and no CI/CD — the repository is entirely Markdown skills and JSON configuration.

## Repository Structure

- `.claude-plugin/marketplace.json` — Root marketplace manifest that registers all plugins
- Each plugin is a self-contained directory with:
  - `.claude-plugin/plugin.json` — Plugin metadata (name, version, author)
  - `skills/<skill-name>/SKILL.md` — Skill definitions (YAML frontmatter + Markdown instructions)
  - `agents/<agent-name>.md` — Optional agent definitions (invoked via `@`-mention or `claude agents`)
  - `CHANGELOG.md` — Keep a Changelog format, updated with every version bump
  - `README.md` — User-facing documentation

## Plugins

### pr-review-autosave
Wraps `pr-review-toolkit` (from the `claude-plugins-official` marketplace) and auto-saves review output.
- Skill `review` — Reviews the current checkout. Uses an explicitly-supplied PR number if given, else detects one from the branch/upstream, else falls back to a WIP review keyed on the short commit hash.
- Agent `pr-review-worktree` — Reviews an arbitrary PR from anywhere: fetches `refs/pull/<N>/head`, creates a worktree under `.claude/worktrees/pr-<N>`, then delegates to the `review` skill.

Output goes to `pr_reviews/` when that directory exists in the **main** worktree root (resolved via `git worktree list --porcelain | head -1`), otherwise the cwd.

## Conventions

- `gh` CLI is required for all GitHub interactions
- Skill files use YAML frontmatter for `allowed-tools`, `description`, `argument-hint`, and `disable-model-invocation`
- Plugin versions follow semver in `plugin.json`
- When modifying a plugin's skills or agents, bump the version in `.claude-plugin/plugin.json` and add a matching `CHANGELOG.md` entry in the same commit — never one without the other. Patch for instruction/wording changes; minor for a new skill or agent.
- Review output filenames: `review_{PR_NUMBER}.md`, `review_{PR_NUMBER}_v{N}.md` for re-reviews, `review_{SHORT_HASH}.md` for WIP reviews with no PR, `review_{SHORT_HASH}_v{N}.md` for WIP re-reviews
- Use `gh` CLI for all GitHub interactions, not web fetch

## Gotchas

- Never add `isolation: worktree` to the `pr-review-worktree` agent frontmatter. It branches from the repo's default branch, not the PR head, so the agent would review the wrong code with no error.

## Adding a Plugin

1. Create a directory: `<plugin-name>/`
2. Add `.claude-plugin/plugin.json` with name, description, version, author
3. Add skills under `<plugin-name>/skills/<skill-name>/SKILL.md`
4. Add a `README.md` for user-facing docs
5. Register the plugin in `.claude-plugin/marketplace.json` under `plugins`
