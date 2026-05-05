# catsby-claude

Claude Code plugins by Clint Shryock.

## Plugins

- **pr-review-autosave** - PR review that automatically saves results to markdown files with a consistent, versioned format. Requires `pr-review-toolkit` from the [`claude-code-plugins`](https://github.com/anthropics/claude-plugins-official) marketplace.

## Review Output Format

Reviews are saved in a consistent format with sequential issue numbering, per-issue metadata, and version tracking for re-reviews. Example:

```markdown
# PR#42 - Add user authentication

**Branch:** `feat/auth`
**Commit:** `abc1234`
**Reviewed:** 2026-04-14
**Files changed:** 8 (120 insertions, 15 deletions)

## Description
Adds JWT-based authentication middleware and login endpoint.

**Description accuracy:** 8/10

---

### Critical

[#1] **SQL injection in login query** - `auth/login.go:47`
*Introduced: v1 | Status: open*
User input is interpolated directly into the SQL query string.

### Important

[#2] **JWT secret loaded from hardcoded string** - `auth/token.go:12`
*Introduced: v1 | Status: open*
Secret should come from environment config, not source code.

### Suggestions

[#3] **Consider rate limiting on login endpoint** - `auth/routes.go:8`
*Introduced: v1 | Status: open*
No rate limiting on the login route; vulnerable to brute force.
```

Re-reviews (v2+) track issue status across versions -- fixed, open, or dismissed -- so you can see progress over time.

## Installation

Add the marketplace to your Claude Code settings:

```json
"pluginMarketplaces": ["https://github.com/catsby/claude-plugins"]
```
