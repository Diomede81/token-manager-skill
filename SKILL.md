# Token Manager Skill

## Purpose
Prevent agents from incorrectly claiming "I don't have access to X API" when tokens exist. This skill provides a **mandatory check system** before making any claims about missing credentials.

## When to Use This Skill
**MANDATORY triggers:**
- User asks to use an external API/service
- User asks "can you access X?"
- User mentions an integration you think might not be available
- **BEFORE** saying "I don't have access to..."
- **BEFORE** saying "I don't have that API token"
- **BEFORE** saying "that integration isn't set up"

## Critical Rule
**❌ NEVER say "I don't have X token" without checking token-registry.md FIRST**

If you violate this rule, the user will have to repeat themselves - which wastes their time.

## How to Use

### Step 1: Check Token Registry (MANDATORY)
```bash
# Always read the registry first
cat token-registry.md
```

Or use the helper script:
```bash
node check-token.js <service-name>
```

### Step 2: Check Token Location
If the registry says the token exists, check where it's stored:

**Encrypted (age):**
```javascript
const { readSecret } = require('../../scripts/age-secrets.js');
const token = readSecret('filename.age');
```

**Environment variable:**
```bash
echo $TOKEN_NAME
```

**Config file:**
```javascript
const config = require('../../path-to-config.json');
```

### Step 3: Only Say "Not Available" If TRULY Missing
After checking registry + location, if the token genuinely doesn't exist:
1. Tell user it's not set up
2. Offer to help set it up
3. Document the request in token-registry.md

## Files in This Skill

### `token-registry.md`
**The single source of truth** for all API tokens/credentials. Lists:
- Service name
- Token type
- Location (encrypted file / env var / config)
- Purpose
- Last verified date
- Notes

### `check-token.js`
Quick lookup script:
```bash
node check-token.js github
# Output: ✅ GitHub token found at ~/.secrets/github-token.txt
```

### `age-secrets.js` (symlink)
Helper for reading encrypted tokens (uses age encryption).

## Adding New Tokens

When a user gives you a new API token:

1. **Store securely:**
   ```javascript
   const { writeSecret } = require('../../scripts/age-secrets.js');
   writeSecret('service-name.age', tokenData);
   ```

2. **Update registry:**
   Add entry to `token-registry.md` with:
   - Service name
   - Location
   - Purpose
   - Date added

3. **Test access:**
   Make a test API call to verify it works.

## Security Rules

- **Never** log full tokens (only last 4 chars for verification)
- **Always** use encrypted storage for sensitive tokens
- **Never** commit tokens to git (use .gitignore)
- **Rotate** tokens if exposed

## Examples

### ❌ Wrong Approach
```
User: "Can you post to Instagram?"
Agent: "I don't have Instagram API access."
```
*Problem: Didn't check token registry*

### ✅ Correct Approach
```
User: "Can you post to Instagram?"
Agent: *checks token-registry.md*
Agent: *sees Instagram token exists at ~/.secrets/instagram-tokens.age*
Agent: *reads token with age-secrets.js*
Agent: "Yes, I can post to Instagram. What would you like to post?"
```

## Maintenance

**Weekly:** Review token-registry.md for expired entries
**Monthly:** Test high-priority tokens (GitHub, AWS, etc.)
**On error:** If a token fails, check expiry and document in registry

## Integration with Other Agents

To use this skill in another agent's workspace:

1. Copy `skills/token-manager/` to agent's workspace
2. Symlink `age-secrets.js` if needed
3. Update `token-registry.md` with agent-specific tokens
4. Add to agent's `AGENTS.md`:
   ```markdown
   ## Before Claiming "No Access"
   - [ ] Check `skills/token-manager/token-registry.md`
   - [ ] If token exists, read it and try
   - [ ] Only say "not available" after confirming
   ```

## Related Files

- `../../scripts/age-secrets.js` - Encryption helper
- `../../.secrets/` - Encrypted token storage
- `../../AGENTS.md` - Agent checklists (should reference this skill)

---

**Version:** 1.0  
**Last Updated:** 2026-03-20  
**Owner:** Max (template for all agents)
