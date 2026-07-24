# Changelog

All notable changes to the `pr-review-autosave` plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-07-24

### Added

- `agents/pr-review-worktree.md` — an agent, so the plugin can be invoked from the `@`-mention typeahead and from `claude agents`. It resolves a PR number, fetches the PR head, creates a dedicated worktree, and then delegates to the `review` skill.
- The agent fetches `refs/pull/<N>/head` rather than resolving `headRefName` and fetching a branch, so PRs opened from forks work.
- Post-`EnterWorktree` assertion that the session actually landed in the PR worktree at the expected commit. Background sessions auto-relocate into a fresh worktree branched from the default branch before editing files; without this check that would silently review the wrong code.
- Post-save assertion that the review file exists at the path the skill reported.
- Explicit prohibitions in the agent against committing, pushing, and opening pull requests. Background sessions that isolate changes in a worktree otherwise do this without asking, which would push review files to the remote.

### Changed

- Skill step 1 now honors an explicitly-supplied PR number and skips branch-based detection when one is given. Branch-based detection fails in a worktree whose local branch has no upstream, which would silently downgrade a PR review to a WIP review and save to `review_<hash>.md`. Auto-detection is unchanged when no number is supplied.

### Notes

- The agent deliberately does NOT set `isolation: worktree` in its frontmatter. That option branches from the repository's default branch, not from the PR under review, which would produce a review of the wrong code.
- The fetch deliberately uses no destination refspec. Fetching into a local branch fails on every re-review with `refusing to fetch into branch '...' checked out at ...` once the worktree is left in place, and `+` does not override it.
- `/pr-review-autosave:review` continues to work as before for sessions already checked out on the branch under review.

## [3.0.8] - 2026-05-20

### Changed

- Step 3 now explicitly prohibits calling `pr-review-toolkit:code-reviewer` or any other sub-agent directly. The instruction names `pr-review-toolkit:review-pr` as the required entry point so the orchestrator runs and determines which sub-agents apply.

## [3.0.7] - 2026-05-05

### Changed

- Skill instructions now explicitly prohibit `cd` to `MAIN_ROOT` when checking for or saving review files; absolute paths are used instead to avoid permission prompts in linked git worktrees.
- Added worktree guidance before the `pr-review-toolkit` invocation: review agents should explore code in the current working directory, not navigate to parent directories.

### Added

- Documented dependency on `pr-review-toolkit` from the `claude-plugins-official` marketplace in `README.md`, including required marketplace and `enabledPlugins` configuration.

## [3.0.6] - 2026-04-29

### Added

- `homepage` and `repository` fields in `plugin.json` so users can find the plugin's source and changelog from marketplace metadata.
- This `CHANGELOG.md`.

### Changed

- Header metadata block (`Branch`, `Commit`, `Reviewed`, `Files changed`) now uses trailing two-space line breaks so each field renders on its own line. Previously the fields collapsed onto a single line in rendered markdown.
- Restructured the per-issue format. Title now stands alone (no inline file path or inline metadata). Metadata is split into discrete fields: `**Introduced:**`, `**Status:**`, `**Files:**` (always a bulleted list, even with one file), followed by `**Details:**` body and optional `**Fix:**` block.
- Status values are now uppercase (`OPEN`, `DISMISSED`, `FIXED`) for consistency and to remove ambiguity.

## Earlier versions

History prior to 3.0.6 is not documented in this changelog. See `git log` for older changes.
