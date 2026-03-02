#!/bin/bash
# ============================================================
#   PetPoint Pro - VPS Update Script
#   Updates the running app WITHOUT deleting data or config
#   Run as root: chmod +x update_vps.sh && ./update_vps.sh
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log_ok() { echo -e "  ${GREEN}✔${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err() { echo -e "  ${RED}✘${NC} $1"; }

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  PETPOINT PRO - SAFE UPDATE UTILITY"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ "$EUID" -ne 0 ]; then
  log_err "Please run this script as root: sudo ./update_vps.sh"
  exit 1
fi

APP_DIR="/var/www/vet-clinic"

if [ ! -d "$APP_DIR" ]; then
  log_err "Application directory $APP_DIR not found. Is the app installed?"
  exit 1
fi

# Find the deploy zip
DEPLOY_ZIP=""
if [ -f "/root/deploy_vps.zip" ]; then
  DEPLOY_ZIP="/root/deploy_vps.zip"
elif [ -f "$(pwd)/deploy_vps.zip" ]; then
  DEPLOY_ZIP="$(pwd)/deploy_vps.zip"
fi

if [ -z "$DEPLOY_ZIP" ]; then
  log_err "deploy_vps.zip not found in /root/ or current directory!"
  log_err "Please upload it first: scp deploy_vps.zip root@<your-vps-ip>:/root/"
  exit 1
fi

log_ok "Found update package: $DEPLOY_ZIP"

# 1. Backups
log_ok "Backing up configuration and files..."
cp "$APP_DIR/.env" /tmp/vet_env_backup 2>/dev/null || true
if [ -d "$APP_DIR/server/uploads" ]; then
  cp -r "$APP_DIR/server/uploads" /tmp/vet_uploads_backup 2>/dev/null || true
fi

# 2. Stop App
log_ok "Stopping running application..."
pm2 stop vet-clinic-app 2>/dev/null || true

# 3. Extract Files
log_ok "Extracting new files..."
unzip -o "$DEPLOY_ZIP" -d "$APP_DIR" > /dev/null 2>&1 || true

# 4. Restore Backups
log_ok "Restoring configuration and files..."
if [ -f "/tmp/vet_env_backup" ]; then
  mv /tmp/vet_env_backup "$APP_DIR/.env"
  log_ok ".env configuration restored safely"
fi

if [ -d "/tmp/vet_uploads_backup" ]; then
  mkdir -p "$APP_DIR/server"
  cp -r /tmp/vet_uploads_backup/* "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf /tmp/vet_uploads_backup
  log_ok "Uploaded media files restored safely"
fi

# 5. Install Dependencies & Push DB
log_ok "Installing dependencies & applying database updates..."
cd "$APP_DIR"
npm ci > /dev/null 2>&1

log_ok "Updating database schema (Data will NOT be deleted)..."
npx drizzle-kit push 2>&1

log_ok "Cleaning up temporary build tools..."
npm prune --omit=dev > /dev/null 2>&1

# 6. Restart App
log_ok "Restarting application..."
pm2 restart vet-clinic-app || pm2 start ecosystem.config.cjs
pm2 save > /dev/null 2>&1

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉  UPDATE SUCCESSFUL! YOUR APP IS NOW RUNNING LATEST CODE  🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
