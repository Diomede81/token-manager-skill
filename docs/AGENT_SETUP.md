# Token Manager Skill - Setup Instructions

**Skill:** token-manager-skill  
**Version:** 1.0.0  
**Port:** 3021  
**Purpose:** Secure credential storage and retrieval for OpenClaw agents. Stores API keys, tokens, and secrets with encryption.

---

## 🔧 Prerequisites

### Required Software

| Dependency | Purpose | Check Command |
|------------|---------|---------------|
| **Node.js** | Runtime | `node --version` |
| **SQLite3** | Database | `sqlite3 --version` |
| **Age** | Encryption | `age --version` |

### Age Encryption Key

Token values are encrypted using Age. Ensure the key is available:

```bash
# Check if key exists
cat ~/.config/age/key.txt 2>/dev/null || echo "No key found"

# Or check environment
echo $AGE_SECRET_KEY
```

**Generate new key if needed:**
```bash
mkdir -p ~/.config/age
age-keygen > ~/.config/age/key.txt
chmod 600 ~/.config/age/key.txt
```

---

## 🚀 Quick Start

### 1. Start the Service

```bash
# Via systemd (recommended)
systemctl --user start token-manager

# Or directly
cd ~/clawd/skills/token-manager
node scripts/server.js
```

### 2. Verify Service is Running

```bash
curl -s http://localhost:3021/api/status | jq
```

Expected output:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "tokenCount": 0
}
```

---

## 🔑 Token Management

### Register a New Token

```bash
curl -X POST http://localhost:3021/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "service": "ServiceName",
    "name": "TOKEN_NAME",
    "value": "your-secret-value",
    "description": "What this token is for",
    "region": "optional-region"
  }'
```

**Required fields:** `service`, `name`, `value`
**Optional fields:** `description`, `region`, `expiresAt`, `tags`

### Search for a Token

```bash
# Search by service name
curl -s "http://localhost:3021/api/search?q=ServiceName" | jq

# Response includes:
# - Token metadata (id, service, name, description)
# - hasValue: true/false (whether value is stored)
# - Does NOT return the actual value for security
```

### Get Token Value (for agent use)

```bash
# Get the decrypted value
curl -s "http://localhost:3021/api/tokens/<id>/value" | jq '.value'
```

⚠️ **Security Note:** Only retrieve token values when needed. Do not log or expose values.

### List All Tokens

```bash
curl -s http://localhost:3021/api/tokens | jq '.[] | {id, service, name, hasValue}'
```

### Update a Token

```bash
curl -X PUT http://localhost:3021/api/tokens/<id> \
  -H "Content-Type: application/json" \
  -d '{
    "value": "new-secret-value",
    "description": "Updated description"
  }'
```

### Delete a Token

```bash
curl -X DELETE http://localhost:3021/api/tokens/<id>
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Health check and stats |
| `/api/tokens` | GET | List all tokens (metadata only) |
| `/api/tokens` | POST | Register new token |
| `/api/tokens/:id` | GET | Get token metadata |
| `/api/tokens/:id` | PUT | Update token |
| `/api/tokens/:id` | DELETE | Delete token |
| `/api/tokens/:id/value` | GET | Get decrypted token value |
| `/api/search` | GET | Search tokens by service/name |
| `/api/setup` | GET | Get setup instructions |

---

## 🔒 Security Model

### Storage
- Token **metadata** stored in plaintext SQLite
- Token **values** encrypted with Age before storage
- Database file: `data/tokens.db`

### Access
- API runs on localhost only (127.0.0.1)
- No authentication by default (assumes local trust)
- Value retrieval logged for audit

### Best Practices
- Never log token values
- Rotate tokens regularly
- Use descriptive names and tags
- Set expiration dates for temporary tokens

---

## 📋 Common Token Types

Register these tokens for typical OpenClaw setups:

### Recall.ai (Meeting Transcription)
```bash
curl -X POST http://localhost:3021/api/tokens \
  -d '{"service": "Recall.ai", "name": "RECALL_API_KEY", "value": "<key>", "region": "eu-central-1"}'
```

### OpenAI
```bash
curl -X POST http://localhost:3021/api/tokens \
  -d '{"service": "OpenAI", "name": "OPENAI_API_KEY", "value": "<key>"}'
```

### Anthropic
```bash
curl -X POST http://localhost:3021/api/tokens \
  -d '{"service": "Anthropic", "name": "ANTHROPIC_API_KEY", "value": "<key>"}'
```

### GitHub
```bash
curl -X POST http://localhost:3021/api/tokens \
  -d '{"service": "GitHub", "name": "GITHUB_TOKEN", "value": "<token>"}'
```

### Cloudflare
```bash
curl -X POST http://localhost:3021/api/tokens \
  -d '{"service": "Cloudflare", "name": "CF_API_TOKEN", "value": "<token>"}'
```

---

## ✅ Verification Checklist

Run these checks to verify setup:

### 1. Service Status
```bash
curl -s http://localhost:3021/api/status | jq '.status'
# Expected: "ok"
```

### 2. Database Connected
```bash
curl -s http://localhost:3021/api/status | jq '.database'
# Expected: "connected"
```

### 3. Test Token Operations
```bash
# Create test token
curl -s -X POST http://localhost:3021/api/tokens \
  -d '{"service": "Test", "name": "TEST_TOKEN", "value": "test123"}' | jq '.id'

# Search for it
curl -s "http://localhost:3021/api/search?q=Test" | jq '.found'
# Expected: true

# Delete it
curl -s -X DELETE http://localhost:3021/api/tokens/<id>
```

---

## 🚨 Troubleshooting

### "Database not connected"
1. Check SQLite is installed: `sqlite3 --version`
2. Check data directory exists: `ls -la data/`
3. Check file permissions: `ls -la data/tokens.db`

### "Encryption failed"
1. Check Age key exists: `cat ~/.config/age/key.txt`
2. Verify key format: should start with `AGE-SECRET-KEY-`
3. Check file permissions: `chmod 600 ~/.config/age/key.txt`

### "Token not found"
1. Check token ID is correct
2. Search by service: `curl "http://localhost:3021/api/search?q=ServiceName"`
3. List all tokens: `curl http://localhost:3021/api/tokens`

### Port already in use
```bash
# Check what's using port 3021
lsof -i :3021

# Kill existing process if needed
kill $(lsof -t -i :3021)
```

---

## 📂 Data Storage

- **Database:** `data/tokens.db`
- **Config:** `config/default.json`
- **Logs:** stdout (via systemd journal)

---

## 🔗 Integration with Other Skills

Skills that depend on token-manager:

| Skill | Tokens Required |
|-------|-----------------|
| agent-meeting-skill | Recall.ai |
| microsoft-middleware | (uses own token storage) |

### How Skills Retrieve Tokens

```javascript
// Example: Retrieve Recall.ai token
const res = await fetch('http://localhost:3021/api/search?q=Recall.ai');
const { token } = await res.json();

if (token?.hasValue) {
  const valueRes = await fetch(`http://localhost:3021/api/tokens/${token.id}/value`);
  const { value } = await valueRes.json();
  // Use value...
}
```

---

*This document was auto-generated. For updates, check `/api/setup` endpoint.*
