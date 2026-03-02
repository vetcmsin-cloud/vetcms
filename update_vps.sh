#!/bin/bash
# ============================================================
#   PetPoint Pro - VPS Update Script (GitHub Pull Method)
#   Run on your VPS via Hostinger terminal or SSH:
#     chmod +x update_vps.sh && ./update_vps.sh
# ============================================================

set -e

# ── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   PETPOINT PRO — VPS UPDATE UTILITY"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ── Config ────────────────────────────────────────────────
APP_DIR="/var/www/petpoint"
PM2_APP_NAME="petpoint"
GITHUB_BRANCH="main"

# ── Check directory ───────────────────────────────────────
if [ ! -d "$APP_DIR" ]; then
  err "App directory $APP_DIR not found."
  exit 1
fi

cd "$APP_DIR"

# ── Step 1: Backup .env & uploads ─────────────────────────
ok "Backing up .env and uploads..."
cp "$APP_DIR/.env" /tmp/petpoint_env_backup 2>/dev/null && ok ".env backed up" || warn ".env not found, skipping"
if [ -d "$APP_DIR/server/uploads" ]; then
  cp -r "$APP_DIR/server/uploads" /tmp/petpoint_uploads_backup 2>/dev/null
  ok "Uploads backed up"
fi

# ── Step 2: Pull latest code from GitHub ──────────────────
ok "Pulling latest code from GitHub ($GITHUB_BRANCH)..."
git fetch origin
git reset --hard origin/$GITHUB_BRANCH
ok "Code updated successfully"

# ── Step 3: Restore .env & uploads ────────────────────────
ok "Restoring .env and uploads..."
if [ -f "/tmp/petpoint_env_backup" ]; then
  mv /tmp/petpoint_env_backup "$APP_DIR/.env"
  ok ".env restored"
fi
if [ -d "/tmp/petpoint_uploads_backup" ]; then
  mkdir -p "$APP_DIR/server/uploads"
  cp -r /tmp/petpoint_uploads_backup/. "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf /tmp/petpoint_uploads_backup
  ok "Uploads restored"
fi

# ── Step 4: Install dependencies ──────────────────────────
ok "Installing dependencies..."
npm ci --silent
ok "Dependencies ready"

# ── Step 5: Build the app ─────────────────────────────────
ok "Building the app (this may take a minute)..."
npm run build
ok "Build complete"

# ── Step 6: Apply database schema changes ─────────────────
ok "Applying database schema updates (data is safe)..."
npx drizzle-kit push 2>&1 | tail -5
ok "Database schema up to date"

# ── Step 7: Restart PM2 ───────────────────────────────────
ok "Restarting app..."
pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 start ecosystem.config.cjs
pm2 save >/dev/null 2>&1
ok "App restarted"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉  UPDATE SUCCESSFUL! PetPoint Pro is now on the latest version${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
pm2 status "$PM2_APP_NAME"
