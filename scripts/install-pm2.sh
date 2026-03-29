#!/bin/bash
# Install Token Manager as PM2-managed always-alive service
# Run with: sudo bash scripts/install-pm2.sh

set -e

echo "=== Token Manager PM2 Installation ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Error: This script must be run as root (use sudo)"
  exit 1
fi

# Get the actual user (not root)
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
  echo "❌ Error: Please run with sudo, not as root user directly"
  exit 1
fi

SKILL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
echo "📂 Skill directory: $SKILL_DIR"
echo "👤 Installing for user: $ACTUAL_USER"
echo ""

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2 globally..."
  npm install -g pm2
else
  echo "✅ PM2 already installed"
fi

# Switch to actual user for PM2 commands
echo ""
echo "🚀 Starting Token Manager with PM2..."
cd "$SKILL_DIR"
sudo -u "$ACTUAL_USER" pm2 start ecosystem.config.js

# Save PM2 process list
echo "💾 Saving PM2 process list..."
sudo -u "$ACTUAL_USER" pm2 save

# Generate startup script
echo "🔧 Generating PM2 startup script..."
STARTUP_CMD=$(sudo -u "$ACTUAL_USER" pm2 startup systemd -u "$ACTUAL_USER" --hp "/home/$ACTUAL_USER" | grep "sudo")

if [ -n "$STARTUP_CMD" ]; then
  echo "🔐 Running startup command..."
  eval "$STARTUP_CMD"
  echo "✅ PM2 startup script installed"
else
  echo "⚠️  Warning: Could not extract startup command"
  echo "   Run manually: pm2 startup systemd -u $ACTUAL_USER --hp /home/$ACTUAL_USER"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Quick commands:"
echo "   pm2 status token-manager    # Check status"
echo "   pm2 logs token-manager      # View logs"
echo "   pm2 restart token-manager   # Restart service"
echo "   pm2 stop token-manager      # Stop service"
echo ""
echo "🌐 API available at: http://localhost:3021"
echo "📊 PM2 will auto-restart on crash and system reboot"
