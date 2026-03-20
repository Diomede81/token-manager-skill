# Token Registry - Single Source of Truth

**Last Updated:** YYYY-MM-DD

## ⚠️ CRITICAL RULE
**Before saying "I don't have X token", CHECK THIS FILE FIRST.**

---

## Example Category

### Example Service
- **Status:** ✅ Available / ⚠️ Needs attention / ❌ Not available
- **Location:** `~/.secrets/service-name.age` OR environment variable
- **Purpose:** What this token is used for
- **Last Verified:** YYYY-MM-DD
- **Notes:** Important details (expiry, refresh requirements, scopes, etc.)

---

## How to Update This File

When you discover a new token or credential:

1. **Add entry above** in appropriate category
2. **Include:** Status, Location, Purpose, Last Verified, Notes
3. **Test it** before marking as ✅ Available
4. **Date the update** at top of file

When a token fails:

1. **Mark as ⚠️** and note the issue
2. **Document** when it was last working
3. **Add recovery steps** if known

---

## Quick Lookup

**"Can you access X?"** → Check this file FIRST before answering.

**Status Legend:**
- ✅ Available and working
- ⚠️ Needs attention / limited access / deprecated
- ❌ Not available / expired

---

**Maintained by:** Your agent name  
**Review Frequency:** Weekly (check status of critical tokens)

---

## Token Registry Updated
**Last Updated:** 2026-03-20

### GitHub
- **Status:** ✅ Available
- **Location:** `~/.secrets/github-token.txt` (plaintext) AND `~/.secrets/github-token.txt.age` (encrypted)
- **Token Type:** Personal Access Token (classic)
- **Scopes:** repo, workflow, admin:org
- **Purpose:** Create PRs, manage repositories, GitHub API operations
- **Last Verified:** 2026-03-20
- **Notes:** Stored both plaintext and encrypted via age

---
**Token updated:** 2026-03-20
**GitHub repo:** https://github.com/Diomede81/token-manager-skill
**Status:** ✅ Live and published
