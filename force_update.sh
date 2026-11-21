#!/bin/bash
# ============================================================
# PetPoint Pro - Force Update (Python zip extraction)
# Upload petpoint_update_zz_inventory_fix.zip to /root/ first
# Then run: bash /root/force_update.sh
# ============================================================

set -e

APP_DIR="/var/www/vet-clinic"
ZIP_FILE="/root/petpoint_update_zz_inventory_fix.zip"
EXTRACT_DIR="/tmp/petpoint_extract_$$"

if [ ! -f "$ZIP_FILE" ]; then
  echo "ERROR: $ZIP_FILE not found."
  exit 1
fi

echo "=== PetPoint Pro Force Update ==="
echo "Zip  : $ZIP_FILE"
echo "App  : $APP_DIR"
echo ""

# Find PM2 app name
PM2_APP_NAME=$(pm2 list --no-color 2>/dev/null | awk -F'|' 'NR>3{gsub(/ /,"",$3); if($3!=""&&$3!="name") print $3; exit}')
[ -z "$PM2_APP_NAME" ] && PM2_APP_NAME="vet-clinic-app"
echo "PM2  : $PM2_APP_NAME"
echo ""

# Stop app
echo "--- Stopping app ---"
pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
sleep 2

# Backup existing dist
BACKUP="$APP_DIR/dist_backup_$(date +%Y%m%d_%H%M)"
cp -r "$APP_DIR/dist" "$BACKUP" 2>/dev/null && echo "Backup: $BACKUP" || echo "No prior dist to backup"

# Extract using Python (handles Windows backslash paths correctly)
echo ""
echo "--- Extracting zip (via Python) ---"
mkdir -p "$EXTRACT_DIR"

python3 - <<PYEOF
import zipfile, os

zip_path = "$ZIP_FILE"
out_dir  = "$EXTRACT_DIR"

with zipfile.ZipFile(zip_path, 'r') as z:
    for info in z.infolist():
        # Normalize Windows backslashes to forward slashes
        normalized = info.filename.replace('\\\\', '/').replace('\\\\\\\\', '/')
        if not normalized or normalized.endswith('/'):
            continue
        dest = os.path.join(out_dir, normalized)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with z.open(info) as src, open(dest, 'wb') as dst:
            dst.write(src.read())

print("Python extraction complete.")
PYEOF

echo "Extracted contents:"
ls -la "$EXTRACT_DIR/"

# Verify key file
if [ ! -f "$EXTRACT_DIR/dist/index.cjs" ]; then
  echo "ERROR: dist/index.cjs not found after extraction!"
  echo "Contents of extract dir:"
  find "$EXTRACT_DIR" -maxdepth 3 | head -20
  rm -rf "$EXTRACT_DIR"
  pm2 restart "$PM2_APP_NAME" 2>/dev/null || true
  exit 1
fi

echo "Server bundle : $(du -h $EXTRACT_DIR/dist/index.cjs | cut -f1)"
echo "Client assets : $(ls $EXTRACT_DIR/dist/public/assets/ | wc -l) files"

# Replace dist
echo ""
echo "--- Replacing dist ---"
rm -rf "$APP_DIR/dist"
cp -r "$EXTRACT_DIR/dist" "$APP_DIR/dist"

# Replace package.json
[ -f "$EXTRACT_DIR/package.json" ] && cp "$EXTRACT_DIR/package.json" "$APP_DIR/package.json" && echo "package.json updated"

# Cleanup
rm -rf "$EXTRACT_DIR"

# Apply DB migration (idempotent)
echo ""
echo "--- Applying DB migration ---"
DB_URL=$(grep DATABASE_URL "$APP_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
if [ -n "$DB_URL" ] && [ -f "$APP_DIR/fix_inventory_tables.sql" ]; then
  psql "$DB_URL" -f "$APP_DIR/fix_inventory_tables.sql" 2>/dev/null && echo "DB migration applied" || echo "DB migration skipped"
else
  echo "Skipping DB migration"
fi

# Restart
echo ""
echo "--- Restarting ---"
cd "$APP_DIR"
pm2 restart "$PM2_APP_NAME" 2>/dev/null || pm2 start dist/index.cjs --name "$PM2_APP_NAME"
sleep 5

echo ""
echo "=== STATUS ==="
pm2 status
echo ""
echo "=== RECENT LOGS ==="
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream 2>/dev/null || true
echo ""
echo "SUCCESS! Update applied."
