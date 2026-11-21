#!/bin/bash
# ================================================================
#  PetPoint Pro — Fix nginx for JSON Backup Download
#  Run this ONCE on your VPS as root:
#    bash ~/fix_nginx_backup.sh
#
#  What it does:
#    - Adds proxy_buffering off + large buffer settings for /api/backup/
#    - Increases proxy_read_timeout so large backups don't timeout
#    - Reloads nginx (no downtime)
# ================================================================
set -eu

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_ok()   { echo -e "  ${GREEN}[OK]  $1${NC}"; }
log_warn() { echo -e "  ${YELLOW}[WARN] $1${NC}"; }
die()      { echo -e "\n${RED}[ABORT] $1${NC}\n"; exit 1; }

echo ""
echo "================================================"
echo "  PetPoint — Fix nginx Backup Download"
echo "================================================"
echo ""

# Find the active nginx site config
NGINX_CONF=""
for f in \
    /etc/nginx/sites-enabled/vet-clinic \
    /etc/nginx/sites-enabled/petpoint \
    /etc/nginx/sites-enabled/default \
    /etc/nginx/conf.d/vet-clinic.conf \
    /etc/nginx/conf.d/petpoint.conf \
    /etc/nginx/conf.d/default.conf; do
    if [ -f "$f" ]; then
        NGINX_CONF="$f"
        break
    fi
done

[ -z "$NGINX_CONF" ] && die "Could not find nginx site config. Pass it manually: NGINX_CONF=/path/to/config bash fix_nginx_backup.sh"
echo "  Found nginx config: $NGINX_CONF"

# Backup the current config
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)"
log_ok "Config backed up"

# Check if we already patched it
if grep -q "proxy_buffering off.*backup" "$NGINX_CONF" 2>/dev/null || grep -q "fix_backup_download" "$NGINX_CONF" 2>/dev/null; then
    log_warn "Backup fix already present in nginx config — skipping patch"
else
    # Insert the /api/backup/ location block BEFORE the catch-all location /
    # We use a Python one-liner because sed multiline is fragile across distros
    python3 - "$NGINX_CONF" <<'PYEOF'
import sys, re

filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()

backup_block = """
    # fix_backup_download: disable buffering for large JSON/SQL downloads
    location /api/backup/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_buffering    off;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        # Pass Content-Disposition through so browser triggers download
        proxy_pass_header  Content-Disposition;
        proxy_pass_header  Content-Length;
    }
"""

# Insert before the first "location /" block
# Matches "    location / {" or "location / {"
new_content = re.sub(
    r'(\s*location\s+/\s*\{)',
    backup_block + r'\1',
    content,
    count=1
)

if new_content == content:
    print("  [WARN] Could not find 'location /' block — appending before last closing brace")
    # Fallback: insert before the last closing brace of the server block
    idx = content.rfind('}')
    new_content = content[:idx] + backup_block + content[idx:]

with open(filepath, 'w') as f:
    f.write(new_content)

print("  [OK]  Backup location block inserted")
PYEOF
    log_ok "nginx config patched"
fi

# Also ensure proxy_buffer_size is generous in http block (if not already set)
HTTP_CONF="/etc/nginx/nginx.conf"
if ! grep -q "proxy_buffer_size" "$HTTP_CONF" 2>/dev/null; then
    # Find the http { block and add settings
    python3 - "$HTTP_CONF" <<'PYEOF'
import sys, re
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()

settings = """
    # PetPoint — generous buffer for API responses
    proxy_buffer_size          128k;
    proxy_buffers              4 256k;
    proxy_busy_buffers_size    256k;
"""

new_content = re.sub(
    r'(http\s*\{)',
    r'\1' + settings,
    content,
    count=1
)
if new_content != content:
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("  [OK]  Buffer sizes added to http block")
else:
    print("  [WARN] Could not auto-patch nginx.conf http block — add manually if needed")
PYEOF
fi

# Test nginx config
echo ""
echo "Testing nginx config..."
if nginx -t 2>&1; then
    log_ok "nginx config test PASSED"
    # Reload nginx (zero downtime)
    nginx -s reload
    log_ok "nginx reloaded — backup download should work now!"
else
    echo ""
    echo -e "${RED}[ERROR] nginx config test FAILED${NC}"
    echo "  Restoring backup..."
    LATEST_BACKUP=$(ls -t "${NGINX_CONF}.bak."* 2>/dev/null | head -1)
    [ -n "$LATEST_BACKUP" ] && cp "$LATEST_BACKUP" "$NGINX_CONF" && log_ok "Backup restored: $LATEST_BACKUP"
    die "nginx config was invalid — restored original. Check $NGINX_CONF manually."
fi

echo ""
echo "================================================"
echo -e "${GREEN}  Done! Test the JSON backup download now.${NC}"
echo "================================================"
echo ""
echo "  If it still fails, check nginx logs:"
echo "    tail -50 /var/log/nginx/error.log"
echo "    pm2 logs vet-clinic-app --lines 30"
echo ""
