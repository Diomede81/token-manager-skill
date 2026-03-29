---
name: token-manager
description: Centralized API token registry for managing credentials across services. Use when agent needs to find tokens, add new credentials, verify token existence, or check what services have tokens configured. Provides REST API for UI-based token management. Prevents agents from incorrectly claiming "I don't have X token" by providing searchable registry.
---

# Token Manager Skill

Centralized registry for API tokens and credentials with REST API for UI configuration.

## ⚠️ CRITICAL: Single Source of Truth

**ALL token metadata MUST be stored in the JSON registry:**
- **Location:** `config/registry.json`
- **API:** Use `POST /api/tokens` to add new tokens
- **CLI:** Use `npm run search` or `check-token.js` to query

**❌ NEVER create standalone JSON files for tokens** (e.g., `api-keys.json`, `custom-tokens.json`)
**❌ NEVER store token metadata outside the registry**
**✅ ALWAYS use the API or registry-manager.js to add/update tokens**

The registry stores **metadata only** (service name, location, status). Actual secrets go in `~/.secrets/` files.

## Quick Start

### Option A: PM2 (Always-Alive - Recommended)

```bash
# Install dependencies
npm install

# Install as PM2-managed service (survives reboots)
sudo bash scripts/install-pm2.sh

# Check status
pm2 status token-manager

# View logs
pm2 logs token-manager
```

**Benefits:**
- ✅ Auto-restarts on crash
- ✅ Survives system reboots
- ✅ Process monitoring
- ✅ Log management

### Option B: Manual Start (Development)

```bash
# Install dependencies
npm install

# Start API server (foreground)
npm start
# → http://localhost:3021

# Search for a token (CLI)
npm run search github
```

**Use this for:** Testing, development, debugging

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tokens | List all tokens |
| POST | /api/tokens | Add new token |
| GET | /api/tokens/:id | Get specific token |
| PUT | /api/tokens/:id | Update token |
| DELETE | /api/tokens/:id | Delete token |
| POST | /api/tokens/:id/verify | Verify token exists |
| POST | /api/verify | Verify all tokens |
| GET | /api/search?q=... | Search for token |
| GET | /api/categories | List categories |
| GET | /api/status | Health and status |
| GET | /api/schema | JSON Schema for UI |

## Usage

### Via API

```bash
# List all tokens
curl http://localhost:3021/api/tokens

# Search for a token
curl "http://localhost:3021/api/search?q=github"

# Add a token
curl -X POST http://localhost:3021/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "service": "GitHub",
    "name": "Personal Access Token",
    "category": "api",
    "locationType": "file",
    "location": "~/.secrets/github-token.txt",
    "scope": "repo, read:org"
  }'

# Verify a token exists
curl -X POST http://localhost:3021/api/tokens/abc123/verify

# Verify all tokens
curl -X POST http://localhost:3021/api/verify
```

### Via Agent

When an agent needs a token:
1. Search: `GET /api/search?q=servicename`
2. If found, use the location to read the token
3. If not found, prompt user to add it

## Token Schema

```json
{
  "service": "GitHub",
  "name": "Personal Access Token",
  "category": "api",
  "locationType": "file",
  "location": "~/.secrets/github-token.txt",
  "scope": "repo, read:org",
  "expires": "2027-01-01T00:00:00Z",
  "notes": "Created for SuperAgents project"
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| service | ✅ | Service name (e.g., GitHub, AWS) |
| location | ✅ | Path to token or env var name |
| name | | Display name |
| category | | api, oauth, webhook, database, other |
| locationType | | file, env, database |
| scope | | Token permissions |
| expires | | Expiration date |
| notes | | Additional info |

### Location Types

| Type | Example Location |
|------|------------------|
| file | ~/.secrets/github-token.txt |
| env | GITHUB_TOKEN |
| database | sqlite:tokens.db#github |

## Categories

Default categories:
- `api` - REST API tokens
- `oauth` - OAuth access/refresh tokens
- `webhook` - Webhook secrets
- `database` - Database credentials
- `other` - Everything else

Add custom categories via `POST /api/categories`.

## Security

- Token values are **never** returned via API (masked as `***`)
- Verification only checks if location exists, doesn't read values
- Store actual tokens in secure locations (encrypted files, env vars)

## Files

```
token-manager-skill/
├── SKILL.md                # This file
├── package.json            # Dependencies
├── ecosystem.config.js     # PM2 configuration
├── config/
│   └── registry.json       # Token registry
├── scripts/
│   ├── server.js           # API server
│   ├── install-pm2.sh      # PM2 installer
│   ├── check-token.js      # CLI search
│   └── verify-tokens.js    # CLI verify all
├── lib/
│   └── registry-manager.js # Registry CRUD
└── logs/
    ├── pm2-out.log         # PM2 output logs
    └── pm2-error.log       # PM2 error logs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3021 | API server port |
| CONFIG_DIR | ./config | Registry storage |

## PM2 Management

### Installation

```bash
# One-time setup (as root/sudo)
sudo bash scripts/install-pm2.sh
```

This script:
1. Installs PM2 globally (if needed)
2. Starts token-manager
3. Saves PM2 process list
4. Configures systemd startup script
5. Survives container/host restarts

### Commands

```bash
# Status
pm2 status token-manager
pm2 logs token-manager --lines 50

# Control
pm2 restart token-manager
pm2 stop token-manager
pm2 start token-manager

# Monitoring
pm2 monit                # Live dashboard
pm2 info token-manager   # Detailed info

# Logs
pm2 logs token-manager               # Stream logs
pm2 logs token-manager --err         # Error logs only
pm2 flush token-manager              # Clear logs
```

### Troubleshooting

**Service not starting:**
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs token-manager --err --lines 100

# Restart
pm2 restart token-manager
```

**After system reboot:**
```bash
# PM2 should auto-start via systemd
# Verify:
pm2 status token-manager

# If not running:
pm2 resurrect  # Restore saved processes
```

---

## Integration

### Agent Workflow

Before claiming "I don't have X token":
1. Call `/api/search?q=X`
2. If found → read from specified location
3. If not found → inform user, offer to add

### SuperAgents UI

UI can:
1. Fetch `/api/schema` to generate forms
2. List tokens via `/api/tokens`
3. Add/edit tokens
4. Run verification via `/api/verify`
