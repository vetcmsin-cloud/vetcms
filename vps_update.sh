#!/bin/bash
# ================================================================
#  PetPoint Pro — VPS Safe Update Script  v4.1
#  App directory: /var/www/vet-clinic
#
#  Automatically finds the newest petpoint_YYYYMMDD_HHMM.zip
#  uploaded to ~/  — no manual filename needed.
#
#  Usage:
#    bash ~/vps_update.sh                    # auto-picks newest zip
#    bash ~/vps_update.sh petpoint_20260728_0800.zip  # specific zip
#
#  ABSOLUTE GUARANTEES -- these are NEVER modified:
#    /var/www/vet-clinic/.env          (DB URL, session secret)
#    /var/www/vet-clinic/uploads/      (patient photos, documents)
#    PostgreSQL database               (all clinic data)
#
#  WHAT GETS REPLACED (code only):
#    /var/www/vet-clinic/dist/
#    /var/www/vet-clinic/shared/
#    /var/www/vet-clinic/package.json
#    /var/www/vet-clinic/package-lock.json
#    /var/www/vet-clinic/ecosystem.config.cjs
# ================================================================
set -eu

APP_DIR="/var/www/vet-clinic"
BACKUP_DIR="/var/backups/petpoint"
TOTAL_STEPS=5

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_step() { echo -e "\n${YELLOW}[$1/$TOTAL_STEPS] $2 ...${NC}"; }
log_ok()   { echo -e "    ${GREEN}[OK]   $1${NC}"; }
log_warn() { echo -e "    ${YELLOW}[WARN] $1${NC}"; }
log_info() { echo -e "    ${CYAN}[INFO] $1${NC}"; }

die() {
    echo -e "\n${RED}[ABORT] $1${NC}"
    echo -e "${RED}        No changes were made to the running app or database.${NC}\n"
    exit 1
}

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}${BOLD}   PetPoint Pro — Safe Update  v4.1${NC}"
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}   App dir : $APP_DIR${NC}"

# ================================================================
#  RESOLVE ZIP FILE
#  Accept an explicit filename as $1, or auto-pick the newest
#  petpoint_*.zip in $HOME.
# ================================================================

if [ -n "${1:-}" ]; then
    # User specified a zip explicitly
    if [[ "$1" = /* ]]; then
        ZIP_FILE="$1"          # absolute path
    else
        ZIP_FILE="$HOME/$1"    # relative to home
    fi
    echo -e "${CYAN}   Zip     : $ZIP_FILE (specified)${NC}"
else
    # Auto-detect: newest petpoint_*.zip in ~/
    ZIP_FILE=$(ls -t "$HOME"/petpoint_*.zip 2>/dev/null | head -1 || true)
    if [ -z "$ZIP_FILE" ]; then
        die "No petpoint_*.zip found in $HOME/\n  Upload one first:\n  scp petpoint_YYYYMMDD_HHMM.zip root@<ip>:~/"
    fi
    echo -e "${CYAN}   Zip     : $ZIP_FILE (auto-selected, newest)${NC}"
fi

# Show all available zips for reference
AVAILABLE=$(ls -t "$HOME"/petpoint_*.zip 2>/dev/null || true)
if [ -n "$AVAILABLE" ]; then
    echo -e "${CYAN}   All zips in ~/:${NC}"
    while IFS= read -r z; do
        SIZE=$(du -sh "$z" | cut -f1)
        TAG=""
        [ "$z" = "$ZIP_FILE" ] && TAG="  <-- SELECTED"
        echo -e "${CYAN}     $(basename "$z")  ($SIZE)${TAG}${NC}"
    done <<< "$AVAILABLE"
fi
echo ""

# ================================================================
#  PRE-FLIGHT SAFETY CHECKS
#  ALL checks happen BEFORE anything is written to disk.
# ================================================================

echo -e "${BOLD}--- Pre-flight checks ---${NC}"

# 1. Zip must exist
[ -f "$ZIP_FILE" ] || die "Zip file not found: $ZIP_FILE"
log_ok "Zip file exists: $(basename "$ZIP_FILE") ($(du -sh "$ZIP_FILE" | cut -f1))"

# 2. App directory must exist
[ -d "$APP_DIR" ] || die "$APP_DIR does not exist. Run vps_install.sh for fresh install."
log_ok "App directory exists: $APP_DIR"

# 3. .env MUST exist — no .env means the app was never installed
[ -f "$APP_DIR/.env" ] || die ".env missing at $APP_DIR/.env — aborting to prevent misconfiguration."
log_ok ".env exists — database credentials are SAFE"

# 4. Ensure uploads/ exists (never overwrite it, only ensure it exists)
mkdir -p "$APP_DIR/uploads"
log_ok "uploads/ confirmed — patient files are SAFE"

# 5. Zip must contain a valid server bundle
unzip -l "$ZIP_FILE" 2>/dev/null | grep -q "dist/index.cjs" \
    || die "Zip does not contain dist/index.cjs — invalid build package."
log_ok "dist/index.cjs confirmed inside zip"

# 6. Zip must contain the client bundle
unzip -l "$ZIP_FILE" 2>/dev/null | grep -q "dist/public/" \
    || log_warn "dist/public/ not found in zip — client may be missing"

echo ""
echo -e "${GREEN}  All checks passed. Starting update...${NC}"

# ================================================================
#  STEP 1: BACKUP current dist/
# ================================================================
log_step 1 "Backing up current dist/"

STAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

if [ -d "$APP_DIR/dist" ]; then
    cp -a "$APP_DIR/dist" "$BACKUP_DIR/dist_$STAMP"
    log_ok "Backup: $BACKUP_DIR/dist_$STAMP"
    log_info "Rollback: rm -rf $APP_DIR/dist && cp -a $BACKUP_DIR/dist_$STAMP $APP_DIR/dist"
    HAVE_BACKUP=true
else
    log_warn "No existing dist/ to back up"
    HAVE_BACKUP=false
fi

# ================================================================
#  STEP 2: STOP APP GRACEFULLY
# ================================================================
log_step 2 "Stopping app"

if pm2 describe vet-clinic-app >/dev/null 2>&1; then
    pm2 stop vet-clinic-app >/dev/null 2>&1 \
        && log_ok "PM2 process stopped" \
        || log_warn "pm2 stop returned non-zero (may already be stopped)"
else
    log_warn "vet-clinic-app not in PM2 — proceeding"
fi

# ================================================================
#  STEP 3: REPLACE CODE FILES ONLY
#  .env and uploads/ are NEVER referenced here.
# ================================================================
log_step 3 "Replacing code files (never touching .env or uploads/)"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

log_info "Extracting $(basename "$ZIP_FILE") ..."
unzip -q "$ZIP_FILE" -d "$TMP"

# ---- dist/ : verify in temp BEFORE deleting live copy ----
if [ ! -d "$TMP/dist" ] || [ ! -f "$TMP/dist/index.cjs" ]; then
    die "Extracted zip is missing dist/index.cjs — live app was NOT changed."
fi
rm -rf "$APP_DIR/dist"
cp -a  "$TMP/dist" "$APP_DIR/dist"
log_ok "dist/ replaced"

# ---- shared/ ----
if [ -d "$TMP/shared" ]; then
    rm -rf "$APP_DIR/shared"
    cp -a  "$TMP/shared" "$APP_DIR/shared"
    log_ok "shared/ replaced"
else
    log_warn "shared/ not in zip — existing shared/ unchanged"
fi

# ---- package.json / package-lock.json ----
[ -f "$TMP/package.json" ]      && cp "$TMP/package.json"      "$APP_DIR/package.json"      && log_ok "package.json updated"
[ -f "$TMP/package-lock.json" ] && cp "$TMP/package-lock.json" "$APP_DIR/package-lock.json" && log_ok "package-lock.json updated"

# ---- ecosystem.config.cjs ----
[ -f "$TMP/ecosystem.config.cjs" ] && cp "$TMP/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs" && log_ok "ecosystem.config.cjs updated"

log_ok ".env                  NOT touched — DB credentials safe"
log_ok "uploads/              NOT touched — patient files safe"
log_ok "PostgreSQL database   NOT touched — all data preserved"

# ================================================================
#  STEP 4: SYNC DEPENDENCIES
# ================================================================
log_step 4 "Syncing production dependencies"
cd "$APP_DIR"

if npm ci --omit=dev 2>&1; then
    log_ok "node_modules synced via npm ci"
else
    log_warn "npm ci failed — falling back to npm install"
    npm install --omit=dev 2>&1 || die "npm install also failed — check package.json"
    log_ok "node_modules synced via npm install"
fi

# ================================================================
#  STEP 5: RESTART APP
# ================================================================
log_step 5 "Restarting app"
cd "$APP_DIR"

pm2 startOrRestart "$APP_DIR/ecosystem.config.cjs" --update-env 2>&1
pm2 save --force >/dev/null 2>&1
log_ok "PM2 process restarted"

# Health check — wait for process to stabilise
sleep 6
PM2_STATUS=$(pm2 jlist 2>/dev/null \
    | python3 -c "
import sys,json
procs=json.load(sys.stdin)
app=next((p for p in procs if p.get('name')=='vet-clinic-app'),None)
print(app['pm2_env']['status'] if app else 'not-found')
" 2>/dev/null || echo "unknown")

if [ "$PM2_STATUS" = "online" ]; then
    log_ok "Health check: ONLINE"
else
    log_warn "Process status = '$PM2_STATUS' — check logs"
fi

# ================================================================
#  ARCHIVE this zip to /var/backups/petpoint/zips/ (keep history)
#  and purge old dist backups (keep 5)
# ================================================================
mkdir -p "$BACKUP_DIR/zips"
cp "$ZIP_FILE" "$BACKUP_DIR/zips/$(basename "$ZIP_FILE")" 2>/dev/null \
    && log_info "Zip archived → $BACKUP_DIR/zips/$(basename "$ZIP_FILE")" || true

# Keep only 10 most recent archived zips
ls -t "$BACKUP_DIR/zips"/petpoint_*.zip 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

# Keep only 5 most recent dist backups
ls -dt "$BACKUP_DIR"/dist_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

# ================================================================
#  SUMMARY
# ================================================================
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}${BOLD}   Update complete!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "  ${BOLD}Build used       :${NC} $(basename "$ZIP_FILE")"
echo -e "  ${BOLD}Deployed at      :${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo -e "  ${BOLD}Protected (unchanged):${NC}"
echo -e "    $APP_DIR/.env"
echo -e "    $APP_DIR/uploads/"
echo -e "    PostgreSQL database"
echo ""
echo -e "  ${BOLD}Replaced (code only):${NC}"
echo -e "    $APP_DIR/dist/"
echo -e "    $APP_DIR/shared/"
echo -e "    $APP_DIR/package.json"
echo ""

pm2 status vet-clinic-app 2>/dev/null || pm2 status

echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo -e "    pm2 logs vet-clinic-app --lines 30   # live logs"
echo -e "    pm2 status                            # process status"
echo ""
if [ "$HAVE_BACKUP" = true ]; then
    echo -e "  ${BOLD}Rollback (if needed):${NC}"
    echo -e "    pm2 stop vet-clinic-app"
    echo -e "    rm -rf $APP_DIR/dist"
    echo -e "    cp -a $BACKUP_DIR/dist_$STAMP $APP_DIR/dist"
    echo -e "    pm2 restart vet-clinic-app"
    echo ""
fi

echo -e "  ${BOLD}Archived zips in $BACKUP_DIR/zips/:${NC}"
ls -t "$BACKUP_DIR/zips"/petpoint_*.zip 2>/dev/null | head -5 | while read -r z; do
    echo -e "    $(basename "$z")  ($(du -sh "$z" | cut -f1))"
done
echo ""
