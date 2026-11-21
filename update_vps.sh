#!/bin/bash
# ============================================================
# PetPoint Pro - Safe Update Script (No Data Loss)
#
# INSTRUCTIONS:
# 1. Upload this script + petpoint_update_*.zip to your VPS /root/
# 2. SSH into your VPS and run:
#      chmod +x /root/update_vps.sh
#      sudo bash /root/update_vps.sh
# ============================================================

set -e

APP_DIR="/var/www/vet-clinic"

# Detect PM2 app name automatically
PM2_APP_NAME=$(pm2 list --no-color 2>/dev/null | awk -F'│' 'NR>3 {gsub(/ /,"",$3); if($3!=""&&$3!="AppName") print $3}' | head -n 1)
if [ -z "$PM2_APP_NAME" ]; then
  PM2_APP_NAME="vet-clinic-app"   # fallback
fi

# Find the NEWEST update zip by modification time (checks /root, /var/www/vet-clinic, or current dir)
ZIP_FILE=$(ls -t /root/petpoint*.zip /var/www/vet-clinic/petpoint*.zip ./petpoint*.zip 2>/dev/null | head -n 1)

if [ -z "$ZIP_FILE" ]; then
  echo "ERROR: No update zip found."
  echo "   Please upload petpoint_update_latest.zip (or petpoint_*.zip) to /root/ or /var/www/vet-clinic/"
  exit 1
fi

echo "================================================"
echo " PetPoint Pro Update"
echo " Package  : $ZIP_FILE"
echo " Modified : $(stat -c '%y' "$ZIP_FILE" | cut -d'.' -f1)"
echo " App Dir  : $APP_DIR"
echo " PM2 Name : $PM2_APP_NAME"
echo "================================================"
echo ""

# Stop app
echo "Stopping $PM2_APP_NAME ..."
pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
sleep 2

# Backup old dist
BACKUP="$APP_DIR/dist_backup_$(date +%Y%m%d_%H%M)"
echo "Backing up current dist to $BACKUP"
cp -r "$APP_DIR/dist" "$BACKUP" 2>/dev/null || echo "   (no previous dist to backup)"

# Extract to temp dir
TMPDIR=$(mktemp -d)
echo "Extracting $ZIP_FILE ..."
unzip -q "$ZIP_FILE" -d "$TMPDIR" || true

echo "   Extracted top-level contents:"
ls "$TMPDIR"

# Verify dist folder exists in the zip
if [ ! -d "$TMPDIR/dist" ]; then
  echo "ERROR: 'dist' folder not found in extracted zip."
  echo "   Contents: $(ls $TMPDIR)"
  rm -rf "$TMPDIR"
  pm2 restart "$PM2_APP_NAME" 2>/dev/null || true
  exit 1
fi

# Verify the main server bundle exists
if [ ! -f "$TMPDIR/dist/index.cjs" ]; then
  echo "ERROR: dist/index.cjs not found - zip may be corrupted or incomplete."
  rm -rf "$TMPDIR"
  pm2 restart "$PM2_APP_NAME" 2>/dev/null || true
  exit 1
fi

echo "   Server bundle size: $(du -h "$TMPDIR/dist/index.cjs" | cut -f1)"
echo "   Client assets: $(ls "$TMPDIR/dist/public/assets/" 2>/dev/null | wc -l) files"

# Replace dist
echo "Replacing dist files..."
rm -rf "$APP_DIR/dist"
cp -r "$TMPDIR/dist" "$APP_DIR/dist"

# Replace package.json if present
if [ -f "$TMPDIR/package.json" ]; then
  cp "$TMPDIR/package.json" "$APP_DIR/package.json"
  echo "package.json updated."
fi

# Cleanup temp
rm -rf "$TMPDIR"

# Also run the inventory fix SQL if it exists (safe, idempotent)
if [ -f "$APP_DIR/fix_inventory_tables.sql" ]; then
  echo "Running inventory tables migration (idempotent)..."
  DB_URL=$(grep DATABASE_URL "$APP_DIR/.env" | cut -d'=' -f2-)
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -f "$APP_DIR/fix_inventory_tables.sql" 2>/dev/null && echo "   DB migration OK" || echo "   DB migration skipped (already applied)"
  fi
fi

# Restart app
echo ""
echo "Restarting $PM2_APP_NAME ..."
cd "$APP_DIR"
pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 start dist/index.cjs --name "$PM2_APP_NAME"

sleep 4
echo ""
echo "=== STATUS ==="
pm2 status
echo ""
echo "=== RECENT LOGS ==="
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream 2>/dev/null || true
echo ""
echo "Update complete! Zip used: $ZIP_FILE"
echo "Logs: pm2 logs $PM2_APP_NAME --lines 30"
