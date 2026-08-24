# catsby-claude

Claude Code plugins by Clint Shryock.

## Plugins

- **pr-review-autosave** - PR review that automatically saves results to markdown files with a consistent, versioned format. Requires `pr-review-toolkit` from the [`claude-plugins-official`](https://github.com/anthropics/claude-plugins-official) marketplace.

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

[#1] **SQL injection in login query**

**Introduced:** v1  
**Status:** OPEN  
**Files:**
  - `auth/login.go:47`

**Details:**

User input is interpolated directly into the SQL query string.

**Fix:** Use a parameterized query instead of string interpolation.

### Important

[#2] **JWT secret loaded from hardcoded string**

**Introduced:** v1  
**Status:** OPEN  
**Files:**
  - `auth/token.go:12`

**Details:**

Secret should come from environment config, not source code.

### Suggestions

[#3] **Consider rate limiting on login endpoint**

**Introduced:** v1  
**Status:** OPEN  
**Files:**
  - `auth/routes.go:8`

**Details:**

No rate limiting on the login route; vulnerable to brute force.
```

Re-reviews (v2+) track issue status across versions -- FIXED, OPEN, or DISMISSED -- so you can see progress over time.

## Installation

Add the marketplace:

```
/plugin marketplace add catsby/claude-plugins
```

Then install the plugin with `/plugin install pr-review-autosave@catsby-claude`, or enable it in your `~/.claude/settings.json`:

```json
"enabledPlugins": {
  "pr-review-autosave@catsby-claude": true
}
```

See the [plugin README](pr-review-autosave/README.md) for the `pr-review-toolkit` dependency.
