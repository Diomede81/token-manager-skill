# Setup Guide for Token Manager Skill

**For OpenClaw Agents**

This guide walks you through setting up the token management system from scratch.

---

## Prerequisites

- OpenClaw agent running (Max, Sophia, Kim, Axel, etc.)
- Node.js v18+ installed
- `age` CLI tool installed (optional, for encrypted tokens)

---

## Step 1: Install the Skill

### Via ClawHub (Recommended - when published)
```bash
clawhub install token-manager
```

### Manual Installation
```bash
# Clone or download the skill
cd ~/.openclaw/skills  # Or ~/.openclaw-{agent}/skills for specific agent
git clone https://github.com/Diomede81/token-manager-skill.git token-manager

# Or copy if you already have it
cp -r /path/to/token-manager-skill ~/.openclaw/skills/token-manager
```

---

## Step 2: Set Up Age Encryption (Optional but Recommended)

If you want encrypted token storage:

### Install age
```bash
# Ubuntu/Debian
sudo apt install age

# macOS
brew install age

# Arch Linux
sudo pacman -S age
```

### Generate a key pair
```bash
# Generate and save to ~/.secrets/age-key.txt
age-keygen > ~/.secrets/age-key.txt
chmod 600 ~/.secrets/age-key.txt
```

**⚠️ CRITICAL:** Back up this key! If you lose it, encrypted tokens are unrecoverable.

### Set environment variable (optional)
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export AGE_KEY_FILE="$HOME/.secrets/age-key.txt"
```

---

## Step 3: Create Your Token Registry

Copy the template and customize:

```bash
cd ~/.openclaw/skills/token-manager
cp token-registry-template.md token-registry.md
```

**Edit `token-registry.md`:**
- Remove sections you don't need
- Add your actual tokens
- Update statuses (✅ Available / ⚠️ Needs attention / ❌ Not available)
- Date each entry

**Example entry:**
```markdown
### GitHub
- **Status:** ✅ Available
- **Location:** `~/.secrets/github-token.txt` (plaintext) OR `~/.secrets/github-token.age` (encrypted)
- **Token Type:** Personal Access Token
- **Scopes:** repo, workflow
- **Purpose:** Create PRs, manage repositories
- **Last Verified:** 2026-03-20
- **Notes:** Expires 2027-03-20, refresh monthly
```

---

## Step 4: Store Your Tokens

### Option A: Plaintext (Quick Start)
```bash
mkdir -p ~/.secrets
chmod 700 ~/.secrets

# Example: GitHub token
echo "ghp_yourtoken" > ~/.secrets/github-token.txt
chmod 600 ~/.secrets/github-token.txt
```

### Option B: Encrypted (Recommended)
```javascript
// Save token with encryption
const { writeSecret } = require('~/.openclaw/skills/token-manager/age-secrets.js');

// Store GitHub token
writeSecret('github-token.age', {
  token: 'ghp_yourtoken',
  scope: 'repo,workflow',
  expires: '2027-03-20'
});

// Store Instagram token
writeSecret('instagram-tokens.age', {
  access_token: 'IGQVJxxxx',
  user_id: '123456',
  expires_in: 5184000  // 60 days
});
```

Or via CLI:
```bash
cd ~/.openclaw/skills/token-manager
node -e "require('./age-secrets.js').writeSecret('github-token.age', {token: 'ghp_xxx'})"
```

---

## Step 5: Test Token Lookup

```bash
cd ~/.openclaw/skills/token-manager

# Check if a token exists
node check-token.js github

# Should output:
# 🔍 Token lookup for "github":
# 📌 GitHub
#    Status:   ✅ Available
#    Location: ~/.secrets/github-token.age
#    Purpose:  Create PRs, manage repositories
# ✅ Token available - proceed with API call
```

---

## Step 6: Integrate with Agent Instructions

Add to your agent's `AGENTS.md` or instruction files:

```markdown
### API Token Check (MANDATORY) ⚠️
**Before saying "I don't have X token":**
- [ ] Check `skills/token-manager/token-registry.md` FIRST
- [ ] Run `node skills/token-manager/check-token.js <service>` if unsure
- [ ] Only claim "not available" AFTER checking registry

**Why:** User has to repeat themselves when you forget tokens exist.
```

---

## Step 7: Clean Up Old Token Files

**Search for stray token files:**
```bash
# Find JSON token files
find ~ -maxdepth 3 -name "*token*.json" -o -name "*credentials*.json" 2>/dev/null

# Find age-encrypted tokens not in .secrets
find ~ -maxdepth 3 -name "*.age" 2>/dev/null | grep -v ".secrets"
```

**Consolidate to `.secrets/`:**
```bash
# Move all tokens to central location
mkdir -p ~/.secrets
mv ~/path/to/old-token.json ~/.secrets/
mv ~/path/to/old-token.age ~/.secrets/

# Update registry with new locations
# Then delete old copies
```

---

## Step 8: Usage Examples

### From Agent Code

```javascript
// Example 1: Check + Read GitHub token
const fs = require('fs');
const registry = fs.readFileSync('skills/token-manager/token-registry.md', 'utf8');

if (registry.includes('### GitHub') && registry.includes('✅ Available')) {
  const { readSecret } = require('./skills/token-manager/age-secrets.js');
  const tokenData = readSecret('github-token.age');
  
  // Use token
  const response = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${tokenData.token}` }
  });
}
```

### From CLI

```bash
# Quick lookup
node ~/.openclaw/skills/token-manager/check-token.js aws

# Read encrypted token
node ~/.openclaw/skills/token-manager/age-secrets.js read github-token.age
```

---

## Maintenance

### Weekly
- Review `token-registry.md` for expiring tokens
- Update statuses if anything changed
- Test critical tokens (GitHub, AWS, etc.)

### When Token Fails
1. Mark as ⚠️ in registry
2. Document the issue
3. Add recovery steps if known
4. Set reminder to fix/rotate

### When Adding New Token
1. Store in `~/.secrets/` (encrypted preferred)
2. Add entry to `token-registry.md`
3. Test with `check-token.js`
4. Document purpose and expiry

---

## Troubleshooting

### "Age key not found"
```bash
# Check key exists
ls -la ~/.secrets/age-key.txt

# Set environment variable
export AGE_KEY_FILE="$HOME/.secrets/age-key.txt"

# Or embed in script
export AGE_KEY="AGE-SECRET-KEY-xxx..."
```

### "Secret file not found"
```bash
# Check file location
ls -la ~/.secrets/

# Verify filename matches registry
cat token-registry.md | grep -A3 "Service Name"
```

### "Failed to decrypt"
- Wrong age key
- File corrupted
- Not encrypted with age (try plaintext read)

---

## Security Best Practices

1. **Never commit `token-registry.md` to git** (already in `.gitignore`)
2. **Always use encrypted storage** for production tokens
3. **Set file permissions:** `chmod 600` for token files
4. **Rotate tokens** every 90 days minimum
5. **Back up age key** (but never commit it!)
6. **Use token scopes:** minimum required permissions only
7. **Monitor usage:** check for suspicious API activity

---

## Migration from Old Token Management

If you have tokens scattered around:

### 1. Find all tokens
```bash
find ~ -maxdepth 4 \( -name "*token*.json" -o -name "*token*.age" -o -name "*credentials*.json" \) 2>/dev/null
```

### 2. Consolidate to `.secrets/`
```bash
mkdir -p ~/.secrets
# Move each token file
mv ~/clawd/luca-microsoft-tokens.json ~/.secrets/
mv ~/clawd/max-microsoft-tokens.age ~/.secrets/
# etc.
```

### 3. Update registry
Document new locations in `token-registry.md`

### 4. Test everything
```bash
# Check each service
node check-token.js github
node check-token.js aws
node check-token.js instagram
```

### 5. Delete old copies
Only after verifying everything works!

---

## Support

- **Issues:** https://github.com/Diomede81/token-manager-skill/issues
- **Documentation:** See `SKILL.md` for detailed technical docs
- **ClawHub:** https://clawhub.com (when published)

---

**Setup complete!** Your agent now has centralized token management.

**Next:** Add the token check rule to your agent's instructions to prevent "I don't have X" mistakes.
