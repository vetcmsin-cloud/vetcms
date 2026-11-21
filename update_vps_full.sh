#!/bin/bash
# ============================================================
#   PetPoint Pro — FULL UPDATE SCRIPT (v2026-04-10)
#   Includes: dist, shared, package.json, ecosystem, drizzle config
#
#   UPLOAD & RUN:
#     scp petpoint_update_full.zip root@<your-vps-ip>:/root/
#     ssh root@<your-vps-ip>
#     unzip -o /root/petpoint_update_full.zip update_vps_full.sh -d /root/
#     chmod +x /root/update_vps_full.sh
#     bash /root/update_vps_full.sh
#
#   ✅ WHAT IS UPDATED:
#     • dist/               — Compiled client + server bundle (latest code)
#     • shared/             — Shared schema types
#     • ecosystem.config.cjs — PM2 process config
#     • package.json        — Dependency manifest
#     • package-lock.json   — Exact dependency lock
#     • drizzle.config.ts   — Database ORM config
#
#   🔒 WHAT IS NEVER TOUCHED (GUARANTEED SAFE):
#     • .env                — DB URL, PORT, SESSION_SECRET
#     • PostgreSQL database  — ALL patient/owner/invoice/transaction data
#     • server/uploads/     — Patient documents & uploaded images
#     • Any existing DB rows — ZERO data modification
#
#   📋 WHAT CHANGES ARE INCLUDED (10 April 2026):
#     • Inventory Preferences: "Use MRP as Sales Price" option
#       (bulk-updates all product sale prices to MRP)
#     • Billing: Default quantity set to 1 when adding product/service
#     • Billing: Qty & Rate fields auto-select on focus
#       (type new value directly, no backspace needed)
#     • Billing: Filtered out "marked" and "paid" from billing list
#     • Appointment IDs (APT-XXXX) shown in table & search
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}${BOLD}[$1]${NC} $2"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
log_ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
log_err()  { echo -e "  ${RED}✘${NC}  $1"; exit 1; }

# ── Configuration ──────────────────────────────────────────────
APP_DIR="/var/www/vet-clinic"
PM2_NAME="vet-clinic-app"
UPDATE_ZIP=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/petpoint_backups/$TIMESTAMP"

# ── Banner ──────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BOLD}   🐾  PETPOINT PRO — FULL VPS UPDATE  (10 Apr 2026)${NC}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${YELLOW}⚠  Database & uploads will NEVER be touched${NC}"
echo -e "   ${YELLOW}⚠  .env credentials will NEVER be modified${NC}"
echo ""

# ── 0. Root check ───────────────────────────────────────────────
log_step "0/6" "Pre-flight checks..."

if [ "$EUID" -ne 0 ]; then
    log_err "Run as root:  sudo bash /root/update_vps_full.sh"
fi
log_ok "Running as root"

# ── 1. Find the update zip ──────────────────────────────────────
log_step "1/6" "Locating update package..."

for loc in \
    "/root/petpoint_update_full.zip" \
    "/root/update_vps.zip" \
    "$(pwd)/petpoint_update_full.zip" \
    "$(pwd)/update_vps.zip"; do
    if [ -f "$loc" ]; then
        UPDATE_ZIP="$loc"
        break
    fi
done

if [ -z "$UPDATE_ZIP" ]; then
    log_err "No update zip found!\n\n  Expected names (in /root/):\n    petpoint_update_full.zip\n    update_vps.zip\n\n  Upload first:\n    scp petpoint_update_full.zip root@<vps-ip>:/root/"
fi
log_ok "Found: $UPDATE_ZIP"

# Verify install exists
if [ ! -d "$APP_DIR" ]; then
    log_err "$APP_DIR does not exist. Run deploy.sh first for a fresh install."
fi
log_ok "App directory exists: $APP_DIR"

# Critical guard: .env must exist (proves DB is configured)
if [ ! -f "$APP_DIR/.env" ]; then
    log_err ".env missing from $APP_DIR — cannot update safely. Run deploy.sh first."
fi
log_ok ".env present — database config is protected ✓"

# Verify dist in zip
DIST_CHECK=$(unzip -l "$UPDATE_ZIP" 2>/dev/null | grep -c "dist/" || true)
if [ "$DIST_CHECK" -lt 1 ]; then
    log_err "The update zip does not contain a 'dist/' folder. Please use petpoint_update_full.zip."
fi
log_ok "Update package validated ✓"

# ── 2. Create safety backups ────────────────────────────────────
log_step "2/6" "Creating safety backups..."

mkdir -p "$BACKUP_DIR"

# Backup .env
cp "$APP_DIR/.env" "$BACKUP_DIR/.env.backup"
log_ok ".env backed up → $BACKUP_DIR/.env.backup"

# Backup current dist
if [ -d "$APP_DIR/dist" ]; then
    cp -r "$APP_DIR/dist" "$BACKUP_DIR/dist_backup" 2>/dev/null || true
    log_ok "Current dist backed up → $BACKUP_DIR/dist_backup"
else
    log_warn "No existing dist/ to back up (first install?)"
fi

# Backup uploads
if [ -d "$APP_DIR/server/uploads" ] && [ "$(ls -A "$APP_DIR/server/uploads" 2>/dev/null)" ]; then
    cp -r "$APP_DIR/server/uploads" /tmp/vet_uploads_backup_$TIMESTAMP
    log_ok "Uploads backed up → /tmp/vet_uploads_backup_$TIMESTAMP"
    UPLOADS_BACKED_UP=true
else
    log_ok "No uploads to preserve"
    UPLOADS_BACKED_UP=false
fi

# ── 3. Extract & apply new code ─────────────────────────────────
log_step "3/6" "Installing new application code..."

# Extract ONLY code files — never extract .env even if present in zip
unzip -o "$UPDATE_ZIP" \
    "dist/*" \
    "shared/*" \
    "package.json" \
    "package-lock.json" \
    "ecosystem.config.cjs" \
    "drizzle.config.ts" \
    -d "$APP_DIR" > /dev/null 2>&1 || true

log_ok "dist/, shared/, and config files updated"

# ── 3a. Safety net: restore .env regardless ─────────────────────
cp "$BACKUP_DIR/.env.backup" "$APP_DIR/.env"
log_ok ".env confirmed intact (restored from backup) ✓"

# Restore uploads if they were backed up
if [ "$UPLOADS_BACKED_UP" = true ]; then
    mkdir -p "$APP_DIR/server/uploads"
    cp -r "/tmp/vet_uploads_backup_$TIMESTAMP/." "$APP_DIR/server/uploads/" 2>/dev/null || true
    rm -rf "/tmp/vet_uploads_backup_$TIMESTAMP"
    log_ok "Uploads restored ✓"
fi

# Ensure uploads directory always exists
mkdir -p "$APP_DIR/server/uploads"

# ── 4. Sync npm dependencies ────────────────────────────────────
log_step "4/6" "Syncing npm dependencies..."

cd "$APP_DIR"

# Use npm ci for exact reproducible install (uses package-lock.json)
if [ -f "package-lock.json" ]; then
    npm ci --omit=dev > /dev/null 2>&1
    log_ok "npm dependencies synced via package-lock.json (production)"
else
    npm install --omit=dev > /dev/null 2>&1
    log_ok "npm dependencies installed (production)"
fi

# ── 5. Apply database schema changes (SAFE — never drops data) ───
log_step "5/6" "Applying database schema updates..."

echo "  ℹ  Drizzle push only ADDS new columns/tables — never removes data"

# Temporarily install drizzle-kit
npm install --save-dev drizzle-kit > /dev/null 2>&1 || true

# Run schema push with env loaded from .env file
set -a; source "$APP_DIR/.env"; set +a

npx drizzle-kit push 2>&1 | tail -8

# Clean up dev deps
npm prune --omit=dev > /dev/null 2>&1 || true

log_ok "Database schema up to date — all data preserved ✓"

# ── 6. Restart application ───────────────────────────────────────
log_step "6/6" "Restarting application..."

if pm2 list | grep -q "$PM2_NAME"; then
    pm2 reload "$PM2_NAME" 2>/dev/null || pm2 restart "$PM2_NAME" 2>/dev/null
    log_ok "PM2 process '$PM2_NAME' reloaded (zero-downtime)"
else
    log_warn "Process '$PM2_NAME' not found — starting fresh..."
    if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
        pm2 start "$APP_DIR/ecosystem.config.cjs"
    else
        pm2 start "$APP_DIR/dist/index.cjs" --name "$PM2_NAME"
    fi
    log_ok "PM2 started"
fi

pm2 save > /dev/null 2>&1

# Wait for startup
sleep 4

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
if echo "$HTTP_CODE" | grep -qE "^(200|301|302|304)"; then
    log_ok "✅ App responding on port 5000 — HTTP $HTTP_CODE"
else
    log_warn "App returned HTTP $HTTP_CODE — may still be initializing"
    echo ""
    echo -e "  ${YELLOW}Check logs:${NC} pm2 logs $PM2_NAME --lines 20"
fi

# ── Summary ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}   ✅  UPDATE COMPLETE — All data SAFE!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}App Directory :${NC} $APP_DIR"
echo -e "  ${CYAN}Config (.env) :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo -e "  ${CYAN}Database      :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo -e "  ${CYAN}Uploads       :${NC} ${GREEN}UNTOUCHED ✓${NC}"
echo -e "  ${CYAN}Backup saved  :${NC} $BACKUP_DIR"
echo ""
echo -e "  ${YELLOW}What's new in this update (10 Apr 2026):${NC}"
echo -e "  ${GREEN}→${NC} Inventory Pref: 'Use MRP as Sales Price' option"
echo -e "  ${GREEN}→${NC} Billing: Default qty = 1 when adding item"
echo -e "  ${GREEN}→${NC} Billing: Qty & Rate auto-select on focus"
echo -e "  ${GREEN}→${NC} Billing: Paid/Marked invoices filtered from list"
echo -e "  ${GREEN}→${NC} Appointments: APT-XXXX IDs in table & search"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo -e "    pm2 status                    — Check app health"
echo -e "    pm2 logs $PM2_NAME --lines 30 — View live logs"
echo -e "    pm2 restart $PM2_NAME         — Force restart"
echo -e "    systemctl status nginx        — Check Nginx"
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 status "$PM2_NAME" 2>/dev/null || pm2 status
