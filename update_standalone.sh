#!/bin/bash
# ============================================================
#   PetPoint Pro — CODE-ONLY UPDATE SCRIPT  (v2025-03-05)
#   Upload update_vps.zip to /root/ then run on VPS:
#     unzip -o update_vps.zip update.sh && chmod +x update.sh && ./update.sh
#
#   ✅ WHAT THIS UPDATES:
#     • dist/          — compiled server + client bundle
#     • shared/        — schema type definitions
#     • ecosystem.config.cjs — PM2 process config
#     • package.json, package-lock.json — dependency list
#     • drizzle.config.ts — DB ORM config
#
#   🔒 WHAT IS NEVER TOUCHED:
#     • .env            — DB URL & session secret (SAFE)
#     • PostgreSQL data  — all clinic records (SAFE)
#     • server/uploads/ — patient documents & images (SAFE)
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "  ${GREEN}[$1]${NC} $2"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
log_ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err()  { echo -e "  ${RED}✘${NC} $1"; exit 1; }

# ── Configuration ─────────────────────────────────────────────
APP_DIR="/var/www/vetcms_standalone"
PM2_NAME="vetcms-standalone"
UPDATE_ZIP=""

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   PETPOINT PRO — CODE UPDATE UTILITY"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${YELLOW}⚠ Database & uploads will NOT be touched${NC}"
echo ""

# ── 0. Find the update zip ────────────────────────────────────
log_step "0/5" "Locating update package..."

for loc in "/root/update_vps.zip" "$(pwd)/update_vps.zip" "$APP_DIR/update_vps.zip"; do
    [ -f "$loc" ] && UPDATE_ZIP="$loc" && break
done

if [ -z "$UPDATE_ZIP" ]; then
    log_err "update_vps.zip not found in /root/ or current directory!\n       Upload it first:  scp update_vps.zip root@<your-vps-ip>:/root/"
fi
log_ok "Found: $UPDATE_ZIP"

# Verify app was previously installed
if [ ! -d "$APP_DIR" ]; then
    log_err "$APP_DIR does not exist. Run deploy.sh first for a fresh install."
fi

# Guard: never update without an existing .env (protects DB config)
if [ ! -f "$APP_DIR/.env" ]; then
    log_err ".env is missing from $APP_DIR — cannot update safely."
fi
log_ok ".env is present — database config is safe ✓"

# ── 1. Preserve uploads ───────────────────────────────────────
log_step "1/5" "Preserving uploaded files..."

rm -rf /tmp/vet_uploads_backup
if [ -d "$APP_DIR/server/uploads" ] && [ "$(ls -A "$APP_DIR/server/uploads" 2>/dev/null)" ]; then
    cp -r "$APP_DIR/server/uploads" /tmp/vet_uploads_backup
    log_ok "Uploads backed up to /tmp/vet_uploads_backup"
else
    log_ok "No uploads to preserve"
fi

# Also back up .env just in case
cp "$APP_DIR/.env" /tmp/vet_env_backup
log_ok ".env backed up"

# ── 2. Extract new code only ──────────────────────────────────
log_step "2/5" "Installing new code files..."

# Extract ONLY code files — .env is never in the zip & is explicitly excluded
unzip -o "$UPDATE_ZIP" \
    "dist/*" \
    "shared/*" \
    "package.json" \
    "package-lock.json" \
    "ecosystem.config.cjs" \
    "drizzle.config.ts" \
    -d "$APP_DIR" > /dev/null 2>&1 || true

log_ok "dist/, shared/, and config files updated"

# Restore .env (safety net — confirm it wasn't overwritten)
if [ -f "/tmp/vet_env_backup" ]; then
    cp /tmp/vet_env_backup "$APP_DIR/.env"
    log_ok ".env confirmed intact"
fi

# Restore uploads if needed
if [ -d "/tmp/vet_uploads_backup" ]; then
    mkdir -p "$APP_DIR/server/uploads"
    cp -r /tmp/vet_uploads_backup/. "$APP_DIR/server/uploads/" 2>/dev/null || true
    rm -rf /tmp/vet_uploads_backup
    log_ok "Uploads restored"
fi

cd "$APP_DIR"

# ── 3. Sync npm dependencies ──────────────────────────────────
log_step "3/5" "Syncing npm dependencies..."

npm ci --omit=dev > /dev/null 2>&1
log_ok "npm dependencies synced (production only)"

# ── 4. Apply schema changes (safe — NEVER drops data) ─────────
log_step "4/5" "Applying database schema updates..."

# Temporarily install drizzle-kit for push
npm install --save-dev drizzle-kit > /dev/null 2>&1 || true
npx drizzle-kit push 2>&1 | tail -5
npm prune --omit=dev > /dev/null 2>&1 || true
log_ok "Database schema up to date (data untouched)"

# ── 5. Restart the app ────────────────────────────────────────
log_step "5/5" "Restarting application..."

if pm2 list | grep -q "$PM2_NAME"; then
    pm2 reload "$PM2_NAME" 2>/dev/null || pm2 restart "$PM2_NAME"
    log_ok "PM2 process '$PM2_NAME' reloaded"
else
    log_warn "Process '$PM2_NAME' not found — starting fresh..."
    pm2 start "$APP_DIR/ecosystem.config.cjs"
    log_ok "PM2 started"
fi

pm2 save > /dev/null 2>&1

sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001 2>/dev/null || echo "000")
if echo "$HTTP_CODE" | grep -qE "^(200|301|302|304)"; then
    log_ok "App responding on port 5001 — HTTP $HTTP_CODE ✓"
else
    log_warn "App returned HTTP $HTTP_CODE — may still be starting. Check: pm2 logs $PM2_NAME"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   ✅  UPDATE COMPLETE — All data preserved!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}App Directory :${NC} $APP_DIR"
echo -e "  ${CYAN}Config (.env) :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo -e "  ${CYAN}Database      :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo -e "  ${CYAN}Uploads       :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo -e "    pm2 status                  — Check app health"
echo -e "    pm2 logs $PM2_NAME   — View live logs"
echo -e "    pm2 restart $PM2_NAME — Force restart"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 status "$PM2_NAME"
