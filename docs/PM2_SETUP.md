# PM2 Setup for Token Manager

## Why PM2?

PM2 keeps Token Manager always alive:
- ✅ Auto-restarts on crash
- ✅ Survives system reboots
- ✅ Process monitoring
- ✅ Log management
- ✅ Zero downtime restarts

## Quick Install

```bash
cd token-manager-skill
sudo bash scripts/install-pm2.sh
```

That's it! The service is now running and will auto-start on boot.

## Verify Installation

```bash
# Check status
pm2 status token-manager

# Test API
curl http://localhost:3021/api/status

# View logs
pm2 logs token-manager --lines 20
```

## What the Installer Does

1. **Installs PM2 globally** (if not present)
   ```bash
   npm install -g pm2
   ```

2. **Starts Token Manager**
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Saves process list**
   ```bash
   pm2 save
   ```

4. **Creates systemd startup script**
   ```bash
   pm2 startup systemd -u <user> --hp /home/<user>
   ```

## Manual Installation (Alternative)

If you prefer manual control:

```bash
# 1. Install PM2
npm install -g pm2

# 2. Start service
pm2 start ecosystem.config.js

# 3. Save process list
pm2 save

# 4. Enable startup (will print a command to run)
pm2 startup systemd

# 5. Run the command it gives you (as sudo)
```

## Configuration

**File:** `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'token-manager',
    script: './scripts/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      PORT: 3021,
      NODE_ENV: 'production'
    }
  }]
};
```

**Modify if needed:**
- Change `PORT` for different port
- Set `watch: true` for auto-reload on code changes
- Adjust `max_memory_restart` for memory limits

## Daily Usage

### Check Status
```bash
pm2 status token-manager
```

### View Logs
```bash
pm2 logs token-manager              # Stream logs
pm2 logs token-manager --lines 100  # Last 100 lines
pm2 logs token-manager --err        # Errors only
```

### Control Service
```bash
pm2 restart token-manager   # Restart (zero downtime)
pm2 stop token-manager      # Stop
pm2 start token-manager     # Start
pm2 delete token-manager    # Remove from PM2
```

### Monitoring
```bash
pm2 monit              # Live dashboard
pm2 info token-manager # Detailed info
```

## Troubleshooting

### Service not running after reboot

```bash
# Check if PM2 startup is enabled
systemctl status pm2-$USER

# If not found, re-run startup
pm2 startup systemd
# Then run the command it provides
```

### High memory usage

```bash
# Check current memory
pm2 info token-manager

# Restart to clear memory
pm2 restart token-manager
```

### Logs filling disk

```bash
# Clear logs
pm2 flush token-manager

# Or configure log rotation in ecosystem.config.js:
max_size: '10M',
retain: 5  // Keep last 5 rotated logs
```

### Can't connect to PM2

```bash
# Kill PM2 daemon and restart
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

## Uninstall

```bash
# 1. Stop and remove from PM2
pm2 delete token-manager
pm2 save

# 2. Disable startup (optional)
pm2 unstartup systemd

# 3. Uninstall PM2 (optional)
npm uninstall -g pm2
```

## vs Systemd

| Feature | PM2 | Systemd |
|---------|-----|---------|
| Auto-restart | ✅ | ✅ |
| Boot startup | ✅ | ✅ |
| Log management | ✅ Built-in | Manual setup |
| Monitoring | ✅ `pm2 monit` | Via `journalctl` |
| Zero downtime restart | ✅ | ❌ |
| Cross-platform | ✅ | ❌ (Linux only) |
| Setup complexity | Simple | More steps |

**Recommendation:** Use PM2 for development/small deployments. Use systemd for production servers where you need deeper system integration.

## Integration with Other Services

### With OpenClaw Gateway

Token Manager runs independently. OpenClaw agents call it via REST API:

```bash
curl http://localhost:3021/api/search?q=github
```

### With Microsoft Middleware

Both can run under PM2:

```bash
pm2 start microsoft-middleware/ecosystem.config.js
pm2 start token-manager/ecosystem.config.js
pm2 save
```

### Port Conflicts

If port 3021 is taken, modify `ecosystem.config.js`:

```javascript
env: {
  PORT: 3022,  // Change here
  NODE_ENV: 'production'
}
```

Then restart:
```bash
pm2 restart token-manager
```

---

**Last Updated:** 30 March 2026
