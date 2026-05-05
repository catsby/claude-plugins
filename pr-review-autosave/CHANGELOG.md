# Changelog

All notable changes to the `pr-review-autosave` plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
