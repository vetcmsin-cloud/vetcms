#!/bin/bash
# ============================================================
#   PetPoint Pro – Server Update Script
#   Upload deploy_vps.tar.gz to /root/ then run:
#     chmod +x /root/update_server.sh && ./update_server.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "  ${CYAN}[$1]${NC} $2"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

APP_DIR="/var/www/petpoint"
PM2_NAME="vet-clinic-app"
TAR_NAME="deploy_vps.tar.gz"

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   PETPOINT PRO — UPDATE UTILITY"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Step 1: Find the tarball ───────────────────────────────
step "1/6" "Locating deployment package..."
DEPLOY_TAR=""
for loc in "/root/$TAR_NAME" "$(pwd)/$TAR_NAME" "$APP_DIR/$TAR_NAME"; do
  [ -f "$loc" ] && DEPLOY_TAR="$loc" && break
done
[ -z "$DEPLOY_TAR" ] && err "$TAR_NAME not found! Upload it first:\n    scp deploy_vps.tar.gz root@<your-vps-ip>:/root/"
ok "Found: $DEPLOY_TAR"

# ── Step 2: Backup .env and uploads ────────────────────────
step "2/6" "Backing up .env and uploads..."
rm -f /tmp/petpoint_env_bkp
rm -rf /tmp/petpoint_uploads_bkp
[ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" /tmp/petpoint_env_bkp && ok ".env backed up"
[ -d "$APP_DIR/server/uploads" ] && cp -r "$APP_DIR/server/uploads" /tmp/petpoint_uploads_bkp && ok "Uploads backed up"

# ── Step 3: Extract new files ──────────────────────────────
step "3/6" "Extracting new version..."
mkdir -p "$APP_DIR"
tar -xzf "$DEPLOY_TAR" -C "$APP_DIR"
ok "Files extracted to $APP_DIR"

# Restore .env
if [ -f "/tmp/petpoint_env_bkp" ]; then
  cp /tmp/petpoint_env_bkp "$APP_DIR/.env"
  ok ".env restored"
else
  warn ".env not found — make sure $APP_DIR/.env exists with your DATABASE_URL and SESSION_SECRET"
fi

# Restore uploads
if [ -d "/tmp/petpoint_uploads_bkp" ]; then
  mkdir -p "$APP_DIR/server/uploads"
  cp -r /tmp/petpoint_uploads_bkp/. "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf /tmp/petpoint_uploads_bkp
  ok "Uploads restored"
fi

mkdir -p "$APP_DIR/server/uploads"
cd "$APP_DIR"

# ── Step 4: Install ALL dependencies (including drizzle-kit for schema push) ──
step "4/6" "Installing dependencies..."
npm ci --silent
ok "Dependencies installed"

# ── Step 5: Apply database schema ─────────────────────────
step "5/6" "Applying database schema..."
echo "  Running drizzle-kit push..."
npx drizzle-kit push 2>&1 | tail -5
ok "Database schema up to date"

# Prune dev deps after schema push
npm prune --omit=dev --silent 2>/dev/null || true
ok "Dev dependencies pruned"

# ── Step 6: Restart PM2 ────────────────────────────────────
step "6/6" "Restarting application..."
if pm2 list | grep -q "$PM2_NAME"; then
  pm2 restart "$PM2_NAME"
  ok "PM2 process '$PM2_NAME' restarted"
else
  warn "Process '$PM2_NAME' not found — starting fresh..."
  pm2 start ecosystem.config.cjs
  ok "PM2 started"
fi
pm2 save > /dev/null 2>&1

sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
if echo "$HTTP_CODE" | grep -qE "^(200|301|302|304)"; then
  ok "App responding on port 5000 — HTTP $HTTP_CODE ✓"
else
  warn "App returned HTTP $HTTP_CODE — it may still be starting up"
  warn "Check logs: pm2 logs $PM2_NAME"
fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉  UPDATE COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}What's new in this update:${NC}"
echo -e "    ✔ Estimates module (create / edit / convert to invoice)"
echo -e "    ✔ Mark as Paid — payment method popup (Cash/UPI/Card/Cheque)"
echo -e "    ✔ Cash given & balance-to-return calculator"
echo -e "    ✔ Lab access for Receptionist & Pharmacy roles"
echo ""
pm2 status "$PM2_NAME"
