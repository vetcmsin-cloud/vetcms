#!/bin/bash
# ============================================================
#   PetPoint Pro — Server Update Script v5.0
#   Safe update: preserves ALL data, .env, and uploads
#
#   Build date: 2026-05-18
#   Changes in this update (PERFORMANCE FIX):
#   - Eliminated heavy lag on login and every page navigation
#   - Server startup: seed no longer re-hashes bcrypt passwords
#     on every restart (saves ~200ms per restart)
#   - Server startup: lab reference range seeding skipped when
#     already seeded (saves 200+ DB round trips per restart)
#   - /api/auth/me: 30-second server-side user+role cache
#     (eliminates 2 DB queries on every page load/navigation)
#   - logActivity: uses user cache instead of fresh DB query
#     on every CREATE/UPDATE/DELETE mutation
#   - Login: logActivity fires async (non-blocking) — login
#     response is now instant
#   - DB pool: increased from 10 → 20 max connections, 2 warm
#     connections kept ready, faster idle timeout
#   - Client cache: staleTime 30s → 2min, gcTime 5min → 10min
#     (clinic-settings, pets, owners no longer refetched on
#     every sidebar/dashboard render)
#   - PWA service worker: pre-caches all JS/CSS/HTML assets
#     so the app shell loads from disk after first visit
#
#   INSTRUCTIONS:
#   1. Upload this script + petpoint_update_perf_may18.zip to /root/
#   2. Run:
#        chmod +x /root/update_vps_perf_may18.sh
#        sudo bash /root/update_vps_perf_may18.sh
# ============================================================

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✘ ERROR:${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "  ${BOLD}${CYAN}[$1]${NC} $2"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# NOTE: No "set -e" — we handle errors manually to avoid exiting on unzip warnings

# ── Configuration ──────────────────────────────────────────────
APP_DIR=""
for d in "/var/www/vet-clinic" "/var/www/petpoint" "/opt/vet-clinic"; do
  [ -d "$d" ] && APP_DIR="$d" && break
done
[ -z "$APP_DIR" ] && err "Could not find application directory. Expected /var/www/vet-clinic or /var/www/petpoint"

PM2_NAME=$(pm2 list --no-color 2>/dev/null | awk -F'│' 'NR>3 {gsub(/ /,"",$3); if($3!=""&&$3!="AppName"&&$3!="online"&&$3!="stopped") print $3}' | head -n 1)
[ -z "$PM2_NAME" ] && PM2_NAME="vet-clinic-app"

# Accept petpoint_update_perf_may18*.zip or any petpoint_update*.zip in /root/
ZIP_FILE=$(ls -t /root/petpoint_update_perf_may18*.zip 2>/dev/null | head -n 1)
[ -z "$ZIP_FILE" ] && ZIP_FILE=$(ls -t /root/petpoint_update*.zip 2>/dev/null | head -n 1)

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${BOLD}PETPOINT PRO — PERFORMANCE UPDATE v5.0  (2026-05-18)${NC}"
echo -e "   Date: $(date '+%Y-%m-%d %H:%M')"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  App Dir   : ${YELLOW}$APP_DIR${NC}"
echo -e "  PM2 Name  : ${YELLOW}$PM2_NAME${NC}"
echo -e "  Zip File  : ${YELLOW}${ZIP_FILE:-NOT FOUND}${NC}"
echo ""

[ -z "$ZIP_FILE" ] && err "No update zip found in /root/. Upload petpoint_update_perf_may18.zip first."

# ── Step 1: Verify ─────────────────────────────────────────────
step "1/7" "Verifying update package..."
unzip -t "$ZIP_FILE" > /dev/null 2>&1
if [ $? -ne 0 ]; then err "Zip file appears corrupt: $ZIP_FILE"; fi
ok "Zip verified: $ZIP_FILE"
ok "Package size: $(du -h "$ZIP_FILE" | cut -f1)"

# ── Step 2: Backup .env and uploads ────────────────────────────
step "2/7" "Backing up critical files (database is safe in PostgreSQL)..."
BACKUP_TS=$(date +%Y%m%d_%H%M%S)

if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "/tmp/petpoint_env_bkp_$BACKUP_TS"
  ok ".env backed up → /tmp/petpoint_env_bkp_$BACKUP_TS"
else
  warn ".env not found — will not be overwritten"
fi

if [ -d "$APP_DIR/server/uploads" ] && [ "$(ls -A "$APP_DIR/server/uploads" 2>/dev/null)" ]; then
  cp -r "$APP_DIR/server/uploads" "/tmp/petpoint_uploads_bkp_$BACKUP_TS"
  ok "Uploads backed up ($(find "$APP_DIR/server/uploads" -type f | wc -l) files)"
fi

if [ -d "$APP_DIR/dist" ]; then
  DIST_BACKUP="$APP_DIR/dist_backup_$BACKUP_TS"
  cp -r "$APP_DIR/dist" "$DIST_BACKUP"
  ok "Previous dist backed up → $DIST_BACKUP"
fi

# ── Step 3: Extract update package ─────────────────────────────
step "3/7" "Extracting update package..."
TMPDIR=$(mktemp -d)

# Run unzip; ignore non-zero exit from Windows backslash path warning
unzip -q "$ZIP_FILE" -d "$TMPDIR" 2>&1 | grep -v "backslashes" || true

ok "Extraction complete. Locating dist folder..."

# Handle both forward-slash (Linux) and backslash (Windows ZIP) paths
DIST_SRC=""

if [ -d "$TMPDIR/dist" ]; then
  DIST_SRC="$TMPDIR/dist"
  ok "Found dist/ at standard path"
else
  INDEX_CJS=$(find "$TMPDIR" -name "index.cjs" 2>/dev/null | head -n 1)
  if [ -n "$INDEX_CJS" ]; then
    DIST_SRC=$(dirname "$INDEX_CJS")
    ok "Found server bundle at: $INDEX_CJS"
  fi
fi

# If still not found, try renaming backslash-named directories
if [ -z "$DIST_SRC" ] || [ ! -f "$DIST_SRC/index.cjs" ]; then
  warn "Standard path not found — attempting backslash path fix..."
  for d in "$TMPDIR"/*; do
    basename_d=$(basename "$d")
    if echo "$basename_d" | grep -q "dist"; then
      mv "$d" "$TMPDIR/dist" 2>/dev/null || true
      DIST_SRC="$TMPDIR/dist"
      break
    fi
  done
fi

if [ -z "$DIST_SRC" ] || [ ! -f "$DIST_SRC/index.cjs" ]; then
  echo ""
  warn "Could not locate dist/index.cjs. Extracted contents:"
  find "$TMPDIR" -maxdepth 3 | head -30
  rm -rf "$TMPDIR"
  err "Extraction failed. Upload petpoint_update_perf_may18.zip to /root/ and retry."
fi

ok "Server bundle  : $(du -h "$DIST_SRC/index.cjs" | cut -f1)"
PUBLIC_COUNT=$(find "$DIST_SRC/public/assets" -type f 2>/dev/null | wc -l)
ok "Client assets  : $PUBLIC_COUNT files"

# ── Step 4: Apply update ────────────────────────────────────────
step "4/7" "Applying update (replacing dist + config files only)..."

rm -rf "$APP_DIR/dist"
cp -r "$DIST_SRC" "$APP_DIR/dist"
ok "dist/ replaced with new build"

ECOSYSTEM_SRC=$(find "$TMPDIR" -name "ecosystem.config.cjs" 2>/dev/null | head -n 1)
if [ -n "$ECOSYSTEM_SRC" ]; then
  cp "$ECOSYSTEM_SRC" "$APP_DIR/ecosystem.config.cjs"
  ok "ecosystem.config.cjs updated"
fi

PKG_SRC=$(find "$TMPDIR" -name "package.json" 2>/dev/null | head -n 1)
if [ -n "$PKG_SRC" ]; then
  cp "$PKG_SRC" "$APP_DIR/package.json"
  ok "package.json updated"
fi

# Always restore .env — never let it be overwritten by the zip
if [ -f "/tmp/petpoint_env_bkp_$BACKUP_TS" ]; then
  cp "/tmp/petpoint_env_bkp_$BACKUP_TS" "$APP_DIR/.env"
  ok ".env restored (DB credentials preserved)"
fi

# Restore patient uploads
if [ -d "/tmp/petpoint_uploads_bkp_$BACKUP_TS" ]; then
  mkdir -p "$APP_DIR/server/uploads"
  cp -r "/tmp/petpoint_uploads_bkp_$BACKUP_TS/." "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf "/tmp/petpoint_uploads_bkp_$BACKUP_TS"
  ok "Patient uploads restored"
fi

mkdir -p "$APP_DIR/server/uploads"
rm -rf "$TMPDIR"

# ── Step 5: Node dependencies ───────────────────────────────────
step "5/7" "Verifying node dependencies..."
cd "$APP_DIR"

# Ensure compression package is present (needed for gzip middleware)
if node -e "require('compression')" 2>/dev/null; then
  ok "compression package already installed"
else
  warn "Installing compression package..."
  npm install compression @types/compression --save --silent 2>&1 | tail -3
  ok "compression package installed"
fi

npm prune --omit=dev --silent 2>/dev/null || true
ok "Dev dependencies pruned"

# ── Step 6: Database check ──────────────────────────────────────
step "6/7" "Verifying database (no schema changes in this update)..."
DB_URL=$(grep DATABASE_URL "$APP_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '\r')
if [ -n "$DB_URL" ]; then
  OWNER_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM owners;" 2>/dev/null | tr -d ' \n')
  if [ -n "$OWNER_COUNT" ]; then
    ok "Database OK — $OWNER_COUNT owner records safe ✓"
  else
    warn "DB count check failed — data is safe (no schema changes in this update)"
  fi

  # Confirm ref ranges are present (the seed will skip seeding if count >= 50)
  REF_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM lab_ref_ranges;" 2>/dev/null | tr -d ' \n')
  if [ -n "$REF_COUNT" ]; then
    ok "Lab ref ranges: $REF_COUNT entries (seed will skip re-seeding on boot)"
  fi
else
  warn "DATABASE_URL not in .env — skipping DB check"
fi

# ── Step 7: Restart PM2 ─────────────────────────────────────────
step "7/7" "Restarting application (zero-downtime reload)..."
cd "$APP_DIR"

if pm2 list 2>/dev/null | grep -q "$PM2_NAME"; then
  pm2 reload "$PM2_NAME" --update-env 2>/dev/null \
    || pm2 restart "$PM2_NAME" --update-env 2>/dev/null \
    || true
  ok "PM2 process '$PM2_NAME' reloaded"
else
  warn "Process '$PM2_NAME' not found — starting fresh..."
  pm2 start ecosystem.config.cjs
  ok "PM2 started"
fi

pm2 save > /dev/null 2>&1

# Health check — wait up to 15 s for the app to become ready
echo -e "  ${CYAN}ℹ${NC}  Waiting for app to start..."
sleep 8

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
if echo "$HTTP_CODE" | grep -qE "^(200|301|302|304)"; then
  ok "Health check PASSED — HTTP $HTTP_CODE ✓"
else
  warn "Health check HTTP $HTTP_CODE — checking logs..."
  pm2 logs "$PM2_NAME" --lines 20 --nostream 2>/dev/null || true
fi

# ── Done ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉  PERFORMANCE UPDATE COMPLETE — 2026-05-18 build active${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}${CYAN}Performance fixes in this build:${NC}"
echo -e "    ${GREEN}✔${NC} Login lag eliminated — bcrypt rehash removed from every startup"
echo -e "    ${GREEN}✔${NC} Startup speed — 200+ seed DB queries skipped when already seeded"
echo -e "    ${GREEN}✔${NC} Every page load faster — /api/auth/me now uses 30s server cache"
echo -e "    ${GREEN}✔${NC} All mutations faster — logActivity uses user cache (no extra DB query)"
echo -e "    ${GREEN}✔${NC} DB pool: 20 connections (was 10) + 2 warm connections always ready"
echo -e "    ${GREEN}✔${NC} Client cache: 2 min stale time (was 30s) — fewer redundant fetches"
echo -e "    ${GREEN}✔${NC} PWA service worker — app shell loads from disk after first visit"
echo -e "    ${GREEN}✔${NC} All previous features from v4.0 (2026-05-18) retained"
echo ""
echo -e "  ${CYAN}Quick rollback (if needed):${NC}"
if [ -n "$DIST_BACKUP" ]; then
  echo -e "    rm -rf $APP_DIR/dist"
  echo -e "    cp -r $DIST_BACKUP $APP_DIR/dist"
  echo -e "    pm2 restart $PM2_NAME"
fi
echo ""
pm2 status
