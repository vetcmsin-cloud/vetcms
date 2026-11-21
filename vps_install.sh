#!/bin/bash
# ============================================================
#  PetPoint Pro — First-Time VPS Install Script
#  App directory: /var/www/vet-clinic
# ============================================================
set -e

APP_DIR="/var/www/vet-clinic"
ZIP_FILE="$HOME/deploy_vps.zip"
NODE_VERSION="20"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}${BOLD}  PetPoint Pro — First-Time Install${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ── 1. Check ZIP ──────────────────────────────────────────
if [ ! -f "$ZIP_FILE" ]; then
  echo -e "${RED}ERROR: ~/deploy_vps.zip not found.${NC}"
  echo "  scp deploy_vps.zip root@<vps-ip>:~/"
  exit 1
fi
echo -e "${GREEN}✓ deploy_vps.zip found${NC}"

# ── 2. Install Node.js 20 if needed ──────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]]; then
  echo -e "${YELLOW}→ Installing Node.js $NODE_VERSION ...${NC}"
  apt-get update -qq
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs -qq
  echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"
else
  echo -e "${GREEN}✓ Node.js $(node -v) OK${NC}"
fi

# ── 3. Install unzip ─────────────────────────────────────
command -v unzip &>/dev/null || apt-get install -y unzip -qq

# ── 4. Install PM2 ───────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo -e "${YELLOW}→ Installing PM2 ...${NC}"
  npm install -g pm2 --silent
  echo -e "${GREEN}✓ PM2 installed${NC}"
else
  echo -e "${GREEN}✓ PM2 $(pm2 -v) OK${NC}"
fi

# ── 5. Create app directory ──────────────────────────────
echo ""
echo -e "${YELLOW}→ Setting up $APP_DIR ...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/uploads"

# ── 6. Extract ZIP ────────────────────────────────────────
echo -e "${YELLOW}→ Extracting files...${NC}"
unzip -q -o "$ZIP_FILE" -d "$APP_DIR"
echo -e "${GREEN}✓ Extracted${NC}"

# ── 7. Install production dependencies ───────────────────
echo -e "${YELLOW}→ Installing dependencies...${NC}"
cd "$APP_DIR"
npm ci --omit=dev --silent
echo -e "${GREEN}✓ Dependencies ready${NC}"

# ── 8. Create .env (if not exists) ───────────────────────
echo ""
if [ -f "$APP_DIR/.env" ]; then
  echo -e "${GREEN}✓ .env already exists — keeping it unchanged${NC}"
else
  echo -e "${BOLD}Setting up .env configuration:${NC}"
  echo ""

  read -rp "DATABASE_URL (postgresql://user:pass@host:5432/db): " DB_URL
  if [ -z "$DB_URL" ]; then
    echo -e "${RED}DATABASE_URL is required.${NC}"; exit 1
  fi

  read -rp "SESSION_SECRET (Enter to auto-generate): " SESSION_SECRET
  [ -z "$SESSION_SECRET" ] && SESSION_SECRET=$(openssl rand -base64 32)

  read -rp "PORT [5000]: " APP_PORT
  APP_PORT="${APP_PORT:-5000}"

  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=$DB_URL
SESSION_SECRET=$SESSION_SECRET
PORT=$APP_PORT
NODE_ENV=production
EOF
  chmod 600 "$APP_DIR/.env"
  echo -e "${GREEN}✓ .env created${NC}"
fi

# ── 9. Start with PM2 ────────────────────────────────────
echo ""
echo -e "${YELLOW}→ Starting app with PM2...${NC}"
cd "$APP_DIR"
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save

# ── 10. PM2 auto-start on reboot ─────────────────────────
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo env" || true)
[ -n "$PM2_STARTUP" ] && eval "$PM2_STARTUP" 2>/dev/null || true
pm2 save

# ── Done ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}${BOLD}  Installation Complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
pm2 status
echo ""
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo -e "  ${BOLD}App URL:${NC}    http://$VPS_IP:5000"
echo -e "  ${BOLD}App dir:${NC}    $APP_DIR"
echo -e "  ${BOLD}Logs:${NC}       pm2 logs vet-clinic-app"
echo -e "  ${BOLD}Restart:${NC}    pm2 restart vet-clinic-app"
echo ""
echo -e "${YELLOW}  For future updates: upload deploy_vps.zip then run ~/vps_update.sh${NC}"
echo ""
