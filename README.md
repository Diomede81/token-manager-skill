# Token Manager Skill

**OpenClaw/SuperAgents skill for centralized API token registry**

A searchable registry of API tokens and credentials that prevents agents from incorrectly claiming "I don't have X token" when tokens exist.

## ⚠️ CRITICAL: No Rogue Token Files

**Single Source of Truth:** `config/registry.json`

| ✅ DO | ❌ DON'T |
|-------|----------|
| Add tokens via `POST /api/tokens` | Create standalone JSON files (`api-keys.json`, etc.) |
| Store secrets in `~/.secrets/*.txt` or `*.age` | Put secrets in random locations |
| Update registry via API or `registry-manager.js` | Write custom token storage code |
| Query via `/api/search?q=service` | Hardcode token locations elsewhere |

**The registry stores metadata only.** Actual secret values go in `~/.secrets/` files.

## Features

- 🔍 **Token search** - Find tokens by service name
- 📋 **Full registry** - List all configured tokens
- ✅ **Verification** - Check if token files/env vars exist
- 🏷️ **Categories** - Organize tokens by type (api, oauth, webhook, etc.)
- 🔒 **Security** - Token values never exposed via API
- 🔧 **REST API** - Full configuration via API (no CLI required)

---

## Quick Start

### Production Setup (PM2 - Always Alive)

```bash
# Clone
git clone https://github.com/Diomede81/token-manager-skill.git
cd token-manager-skill

# Install
npm install

# Start as always-alive service
sudo bash scripts/install-pm2.sh
# → http://localhost:3021

# Check status
pm2 status token-manager
```

**PM2 provides:**
- ✅ Auto-restart on crash
- ✅ Survives system reboots  
- ✅ Process monitoring
- ✅ Log management

See [docs/PM2_SETUP.md](docs/PM2_SETUP.md) for details.

### Development Setup (Manual)

```bash
# Install
npm install

# Start (foreground)
npm start
# → http://localhost:3021
```

---

## API Reference

**Base URL:** `http://localhost:3021`

### Tokens

#### GET /api/tokens
List all tokens (values masked).

```bash
curl http://localhost:3021/api/tokens
```

**Response:**
```json
{
  "tokens": [
    {
      "id": "abc123",
      "service": "GitHub",
      "name": "Personal Access Token",
      "category": "api",
      "locationType": "file",
      "location": "~/.secrets/github-token.txt",
      "scope": "repo, read:org",
      "status": "valid",
      "lastVerified": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**Filter by category:**
```bash
curl "http://localhost:3021/api/tokens?category=api"
```

#### POST /api/tokens
Add a new token to registry.

```bash
curl -X POST http://localhost:3021/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "service": "GitHub",
    "name": "Personal Access Token",
    "category": "api",
    "locationType": "file",
    "location": "~/.secrets/github-token.txt",
    "scope": "repo, read:org",
    "notes": "Created for CI/CD"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": {
    "id": "xyz789",
    "service": "GitHub",
    "name": "Personal Access Token",
    "category": "api",
    "locationType": "file",
    "location": "~/.secrets/github-token.txt",
    "scope": "repo, read:org",
    "status": "unknown",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### GET /api/tokens/:id
Get a specific token.

```bash
curl http://localhost:3021/api/tokens/abc123
```

#### PUT /api/tokens/:id
Update a token.

```bash
curl -X PUT http://localhost:3021/api/tokens/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "repo, read:org, write:packages",
    "notes": "Updated scope for package publishing"
  }'
```

#### DELETE /api/tokens/:id
Remove a token from registry.

```bash
curl -X DELETE http://localhost:3021/api/tokens/abc123
```

### Verification

#### POST /api/tokens/:id/verify
Check if a token file/env var exists at its configured location.

```bash
curl -X POST http://localhost:3021/api/tokens/abc123/verify
```

**Response (file exists):**
```json
{
  "success": true,
  "exists": true,
  "error": null,
  "fileSize": 41,
  "modifiedAt": "2026-03-20T09:00:00Z"
}
```

**Response (file missing):**
```json
{
  "success": true,
  "exists": false,
  "error": "ENOENT: no such file or directory"
}
```

#### POST /api/verify
Verify all tokens in registry.

```bash
curl -X POST http://localhost:3021/api/verify
```

**Response:**
```json
{
  "success": true,
  "total": 5,
  "valid": 4,
  "missing": 1,
  "results": [
    {"id": "abc", "service": "GitHub", "exists": true},
    {"id": "xyz", "service": "Slack", "exists": false, "error": "File not found"}
  ]
}
```

### Search

#### GET /api/search
Search for a token by service name.

```bash
curl "http://localhost:3021/api/search?q=github"
# or
curl "http://localhost:3021/api/search?service=github"
```

**Response (found):**
```json
{
  "success": true,
  "found": true,
  "token": {
    "id": "abc123",
    "service": "GitHub",
    "name": "Personal Access Token",
    "location": "~/.secrets/github-token.txt",
    "status": "valid"
  }
}
```

**Response (not found):**
```json
{
  "success": false,
  "found": false,
  "message": "No token found for \"slack\""
}
```

### Categories

#### GET /api/categories
List all categories.

```bash
curl http://localhost:3021/api/categories
```

**Response:**
```json
{
  "categories": ["api", "oauth", "webhook", "database", "other"]
}
```

#### POST /api/categories
Add a new category.

```bash
curl -X POST http://localhost:3021/api/categories \
  -H "Content-Type: application/json" \
  -d '{"category": "payment"}'
```

### Status

#### GET /api/status
Health check and registry stats.

```bash
curl http://localhost:3021/api/status
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "tokens": {
    "total": 10,
    "valid": 8,
    "missing": 1,
    "unknown": 1
  },
  "categories": 5
}
```

### Schema

#### GET /api/schema
JSON Schema for UI form generation.

```bash
curl http://localhost:3021/api/schema
```

---

## Token Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `service` | string | Service name (e.g., "GitHub", "AWS", "Cloudflare") |
| `location` | string | Path to token file or env var name |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable display name |
| `category` | string | One of: api, oauth, webhook, database, other |
| `locationType` | string | One of: file, env, database |
| `scope` | string | Token permissions/scope |
| `expires` | string | ISO date when token expires |
| `notes` | string | Additional information |
| `envVar` | string | Environment variable name (if locationType is "env") |

### Location Types

| Type | Example | Description |
|------|---------|-------------|
| `file` | `~/.secrets/github.txt` | Token stored in a file |
| `env` | `GITHUB_TOKEN` | Token in environment variable |
| `database` | `sqlite:tokens.db` | Token in database |

---

## Agent Configuration Guide

**For AI agents using this skill:**

### Step 1: Start the server
```bash
cd /path/to/token-manager-skill
npm install
npm start
```

### Step 2: Search before claiming "no token"
**MANDATORY:** Before saying "I don't have X token", always search first:

```bash
curl "http://localhost:3021/api/search?q=github"
```

If found, use the `location` field to read the actual token.

### Step 3: Add tokens to registry (CORRECT WAY)
When you discover a new token, **ALWAYS use the API**:

```bash
# 1. Store the actual secret in ~/.secrets/
echo "your-api-key-here" > ~/.secrets/service-name-token.txt
chmod 600 ~/.secrets/service-name-token.txt

# 2. Register the token metadata via API
curl -X POST http://localhost:3021/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "service": "ServiceName",
    "name": "API Key",
    "category": "api",
    "locationType": "file",
    "location": "~/.secrets/service-name-token.txt"
  }'
```

**⚠️ NEVER create standalone JSON files like `api-keys.json` or `custom-tokens.json`!**
**⚠️ ALWAYS use `POST /api/tokens` to register new tokens!**

### Step 4: Verify tokens exist
After adding, verify it's accessible:

```bash
curl -X POST http://localhost:3021/api/tokens/{id}/verify
```

### Step 5: Periodic health check
Run verification on all tokens:

```bash
curl -X POST http://localhost:3021/api/verify
```

---

## Common Token Examples

### File-based Token
```json
{
  "service": "GitHub",
  "name": "Personal Access Token",
  "category": "api",
  "locationType": "file",
  "location": "~/.secrets/github-token.txt",
  "scope": "repo, read:org"
}
```

### Environment Variable
```json
{
  "service": "OpenAI",
  "name": "API Key",
  "category": "api",
  "locationType": "env",
  "location": "OPENAI_API_KEY",
  "envVar": "OPENAI_API_KEY"
}
```

### OAuth Token (with expiry)
```json
{
  "service": "Google",
  "name": "OAuth Refresh Token",
  "category": "oauth",
  "locationType": "file",
  "location": "~/.config/google/tokens.json",
  "expires": "2027-01-01T00:00:00Z",
  "notes": "Auto-refreshed by middleware"
}
```

### Encrypted Token
```json
{
  "service": "AWS",
  "name": "Credentials (encrypted)",
  "category": "api",
  "locationType": "file",
  "location": "~/.secrets/aws-credentials.age",
  "notes": "Decrypt with: age -d -i ~/.age/key.txt"
}
```

---

## Security

### What's Protected
- ✅ Token **values** are NEVER returned via API (masked as `***`)
- ✅ Verification only checks if location **exists**, doesn't read content
- ✅ Registry stores **metadata only**, not actual secrets

### What's Stored
The registry (`config/registry.json`) contains:
- Service names
- Token locations (paths/env var names)
- Categories and notes
- Verification status

### What's NOT Stored
- Actual token values
- Passwords or secrets

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3021` | API server port |
| `CONFIG_DIR` | `./config` | Registry storage directory |

---

## File Structure

```
token-manager-skill/
├── SKILL.md              # OpenClaw skill metadata
├── README.md             # This file
├── package.json
├── config/
│   └── registry.json     # Token registry (metadata only)
├── scripts/
│   ├── server.js         # API server (npm start)
│   ├── check-token.js    # CLI search tool
│   └── verify-tokens.js  # CLI verify all
└── lib/
    └── registry-manager.js # Registry CRUD operations
```

---

## Integration with Other Skills

### Agent Workflow
```
Agent needs GitHub token
    ↓
Search: GET /api/search?q=github
    ↓
Found? → Read file at location
    ↓
Not found? → Inform user, offer to add
```

### With Daily Briefing
The Daily Briefing skill can use Token Manager to find Microsoft Middleware credentials:

```bash
# Check if we have middleware access
curl "http://localhost:3021/api/search?q=microsoft"
```

---

## License

MIT
