# Token Manager - OpenClaw Skill

**Version:** 1.0.0  
**Category:** Productivity  
**Compatibility:** All OpenClaw agents

## Overview

Centralized API token/credential registry and lookup system. **Prevents agents from incorrectly claiming "I don't have access to X" when tokens exist.**

## The Problem

**Without this skill:**
```
Agent: "I don't have X token"
User: "Yes you do, check again"
Agent: "Oh sorry, found it"
```
**Result:** User wastes time repeating themselves.

**With this skill:**
- Agent checks `token-registry.md` before answering
- Agent finds token immediately
- **Result:** User gets correct answer first time

## Installation

### Via ClawHub (Recommended)
```bash
clawhub install token-manager
```

### Manual Installation
```bash
# Copy to your agent's skills directory
cp -r token-manager ~/.openclaw/skills/

# Or for specific agent
cp -r token-manager ~/.openclaw-{agent}/skills/
```

## Setup

1. **Copy the template:**
   ```bash
   cd ~/.openclaw/skills/token-manager
   cp token-registry-template.md token-registry.md
   ```

2. **Customize the registry:**
   Document your API tokens in `token-registry.md`

3. **Add to agent's checklist:**
   Edit your agent's `AGENTS.md` or instructions:
   
   ```markdown
   ### API Token Check (MANDATORY)
   **Before saying "I don't have X token":**
   - [ ] Check skills/token-manager/token-registry.md FIRST
   - [ ] Run node skills/token-manager/check-token.js <service> if unsure
   - [ ] Only claim "not available" AFTER checking registry
   ```

## Usage

### Quick Lookup
```bash
cd ~/.openclaw/skills/token-manager
node check-token.js github
```

Output:
```
🔍 Token lookup for "github":

📌 GitHub
   Status:   ✅ Available
   Location: ~/.secrets/github-token.txt
   Purpose:  Create PRs, manage repos
   Notes:    PAT may need refresh

✅ Token available - proceed with API call
```

### From Agent Code
```javascript
// 1. Check if token exists
const fs = require('fs');
const registry = fs.readFileSync('skills/token-manager/token-registry.md', 'utf8');
const hasGithub = registry.includes('### GitHub') && registry.includes('✅ Available');

if (hasGithub) {
  // 2. Read encrypted token
  const { readSecret } = require('./skills/token-manager/age-secrets.js');
  const token = readSecret('github-token.age');
  
  // 3. Use it
  const response = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Files

| File | Purpose |
|------|---------|
| `token-registry.md` | **Single source of truth** - all tokens documented here |
| `token-registry-template.md` | Example template with common services |
| `check-token.js` | CLI lookup tool |
| `age-secrets.js` | Helper for encrypted tokens (requires `age` CLI) |
| `SKILL.md` | Detailed documentation |

## Token Registry Format

```markdown
### Service Name
- **Status:** ✅ Available / ⚠️ Needs attention / ❌ Not available
- **Location:** ~/.secrets/service-name.age OR env variable
- **Purpose:** What it's used for
- **Last Verified:** 2026-03-20
- **Notes:** Expiry, refresh requirements, etc.
```

## Encrypted Token Storage (Optional)

If you want to use encrypted token storage:

1. **Install age:**
   ```bash
   sudo apt install age  # Ubuntu/Debian
   brew install age      # macOS
   ```

2. **Generate a key:**
   ```bash
   age-keygen > ~/.secrets/age-key.txt
   chmod 600 ~/.secrets/age-key.txt
   ```

3. **Store tokens:**
   ```javascript
   const { writeSecret } = require('./skills/token-manager/age-secrets.js');
   writeSecret('github-token.age', { token: 'ghp_xxxx' });
   ```

4. **Read tokens:**
   ```javascript
   const { readSecret } = require('./skills/token-manager/age-secrets.js');
   const token = readSecret('github-token.age');
   ```

## Maintenance

- **Weekly:** Review `token-registry.md` for expired tokens
- **Monthly:** Test critical tokens (GitHub, AWS, etc.)
- **On failure:** Mark status as ⚠️ and document the issue

## Examples

The `token-registry-template.md` includes examples for common services:
- AWS, Cloudflare
- GitHub
- Instagram, WhatsApp
- Sentry
- OpenAI, Anthropic
- And more...

## Benefits

1. ✅ **No more "I don't have X" mistakes**
2. ✅ **Single source of truth** for all credentials
3. ✅ **Quick lookups** via CLI tool
4. ✅ **Encrypted storage** (optional, via age)
5. ✅ **Generic design** - works for all agents
6. ✅ **Self-documenting** - registry explains each token

## Security

- Never log full tokens (only last 4 chars for verification)
- Always use encrypted storage for sensitive tokens
- Never commit tokens to git (`.gitignore` includes `token-registry.md`)
- Rotate tokens if exposed

## License

MIT

## Author

Max Ferretti (max@tulip-tech.com)

## Repository

https://github.com/Diomede81/token-manager-skill
