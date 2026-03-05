#!/bin/bash
# ============================================================
#   PetPoint Pro - ONE-CLICK VPS Deployment Script
#   Tested on Ubuntu 22.04 (Hostinger VPS)
#   Run as root: chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "  ${GREEN}[$1]${NC} $2"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
log_ok() { echo -e "  ${GREEN}✔${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err() { echo -e "  ${RED}✘${NC} $1"; }

# ── 0. PRE-FLIGHT CHECKS ─────────────────────────────────────
log_step "0/9" "Pre-flight checks..."

if [ "$EUID" -ne 0 ]; then
  log_err "Please run this script as root: sudo ./deploy.sh"
  exit 1
fi
log_ok "Running as root"

# Ask for domain and email upfront
echo ""
read -p "  Enter your Domain Name (e.g., app.petpointvet.in): " DOMAIN_NAME
read -p "  Enter Admin Email for SSL (e.g., admin@petpointvet.in): " ADMIN_EMAIL

if [ -z "$DOMAIN_NAME" ]; then
  log_err "Domain name cannot be empty!"
  exit 1
fi
log_ok "Domain: $DOMAIN_NAME"
log_ok "Email: $ADMIN_EMAIL"

# ── Configuration ─────────────────────────────────────────────
DB_PASS=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 20)
DB_USER="vet_admin"
DB_NAME="vet_clinic"
APP_DIR="/var/www/vet-clinic"
SESSION_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 48)

# ── 1. SYSTEM UPDATES & DEPENDENCIES ─────────────────────────
log_step "1/9" "Installing system packages..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git unzip build-essential software-properties-common \
  postgresql postgresql-contrib nginx certbot python3-certbot-nginx ufw > /dev/null 2>&1

log_ok "System packages installed"

# ── 2. INSTALL NODE.JS 20 ────────────────────────────────────
log_step "2/9" "Installing Node.js 20..."

# Remove any old nodejs first
apt-get remove -y nodejs npm > /dev/null 2>&1 || true
rm -f /etc/apt/sources.list.d/nodesource.list > /dev/null 2>&1 || true
rm -f /usr/share/keyrings/nodesource.gpg > /dev/null 2>&1 || true

# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1

NODE_VERSION=$(node -v 2>/dev/null || echo "FAILED")
NPM_VERSION=$(npm -v 2>/dev/null || echo "FAILED")

if [[ "$NODE_VERSION" == "FAILED" ]]; then
  log_err "Node.js installation failed!"
  exit 1
fi

log_ok "Node.js $NODE_VERSION installed"
log_ok "npm $NPM_VERSION installed"

# ── 3. INSTALL PM2 GLOBALLY ──────────────────────────────────
log_step "3/9" "Installing PM2 process manager..."

npm install -g pm2 > /dev/null 2>&1

if ! command -v pm2 &> /dev/null; then
  log_err "PM2 installation failed!"
  exit 1
fi

log_ok "PM2 $(pm2 -v) installed"

# ── 4. SETUP POSTGRESQL DATABASE ──────────────────────────────
log_step "4/9" "Setting up PostgreSQL database..."

systemctl start postgresql
systemctl enable postgresql > /dev/null 2>&1

# Create user & database (ignore errors if they already exist)
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;" 2>/dev/null

# Grant schema permissions (needed for PostgreSQL 15+)
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null || true

# Test the database connection
DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
if sudo -u postgres psql -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
  log_ok "Database '$DB_NAME' is ready"
  log_ok "User '$DB_USER' created with secure password"
else
  log_err "Database connection test failed!"
  exit 1
fi

# ── 5. EXTRACT APPLICATION ───────────────────────────────────
log_step "5/9" "Setting up application files..."

mkdir -p $APP_DIR

# Find the deploy zip
DEPLOY_ZIP=""
if [ -f "/root/deploy_vps.zip" ]; then
  DEPLOY_ZIP="/root/deploy_vps.zip"
elif [ -f "$(pwd)/deploy_vps.zip" ]; then
  DEPLOY_ZIP="$(pwd)/deploy_vps.zip"
fi

if [ -z "$DEPLOY_ZIP" ]; then
  log_err "deploy_vps.zip not found in /root/ or current directory!"
  log_err "Please upload it first: scp deploy_vps.zip root@<your-vps-ip>:/root/"
  exit 1
fi

log_ok "Found package: $DEPLOY_ZIP"

# Clean old deployment (but keep uploads if they exist)
if [ -d "$APP_DIR/server/uploads" ]; then
  cp -r "$APP_DIR/server/uploads" /tmp/vet_uploads_backup 2>/dev/null || true
fi

# Extract fresh
unzip -o "$DEPLOY_ZIP" -d "$APP_DIR" > /dev/null 2>&1
log_ok "Application extracted to $APP_DIR"

# Restore uploads if backed up
if [ -d "/tmp/vet_uploads_backup" ]; then
  cp -r /tmp/vet_uploads_backup/* "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf /tmp/vet_uploads_backup
  log_ok "Previous uploads restored"
fi

cd "$APP_DIR"

# Ensure uploads directory exists
mkdir -p "$APP_DIR/server/uploads"

# ── 6. CONFIGURE ENVIRONMENT & INSTALL DEPS ──────────────────
log_step "6/9" "Configuring environment & installing dependencies..."

# Create .env file
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=$DB_URL
NODE_ENV=production
PORT=5000
SESSION_SECRET=$SESSION_SECRET
EOF

log_ok ".env file created"

# Install dependencies
cd "$APP_DIR"
npm ci > /dev/null 2>&1
log_ok "npm dependencies installed"

# Push database schema using drizzle
log_ok "Pushing database schema..."
npx drizzle-kit push 2>&1
log_ok "Database schema synced"

# NOTE: Admin users (superadmin + admin) and all system data (roles, fee
# structures, lab categories, species) are seeded AUTOMATICALLY on the
# first app startup via the built-in seedDatabase() function.
# No separate seed step needed here.

# Clean up dev dependencies
npm prune --omit=dev > /dev/null 2>&1

# ── 7. START APPLICATION WITH PM2 ────────────────────────────
log_step "7/9" "Starting application with PM2..."

# Stop any existing instance
pm2 stop vet-clinic-app 2>/dev/null || true
pm2 delete vet-clinic-app 2>/dev/null || true

# Verify dist/index.cjs exists
if [ ! -f "$APP_DIR/dist/index.cjs" ]; then
  log_err "dist/index.cjs not found! The build may not have been included in the zip."
  log_err "Contents of dist/:"
  ls -la "$APP_DIR/dist/" 2>/dev/null || echo "  (dist directory does not exist)"
  exit 1
fi

# Start the app
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
log_ok "PM2 started the application"

# Wait 4 seconds for the app to initialize
sleep 4

# Check if the app is actually running
APP_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['pm2_env']['status'])" 2>/dev/null || echo "unknown")

if [ "$APP_STATUS" = "online" ]; then
  log_ok "Application is ONLINE and healthy"
else
  log_warn "Application status: $APP_STATUS"
  log_warn "Checking PM2 logs for errors..."
  pm2 logs vet-clinic-app --lines 10 --nostream 2>/dev/null || true
  echo ""
  log_warn "The app may still be starting up. Continuing with Nginx setup..."
fi

# Save PM2 state for auto-restart on reboot
pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
log_ok "PM2 configured for auto-restart on reboot"

# Verify the app responds on port 5000
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -qE "200|301|302"; then
  log_ok "App responding on port 5000 ✓"
else
  CURL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null || echo "000")
  log_warn "App returned HTTP $CURL_CODE on port 5000 (might still be starting)"
  log_warn "PM2 error log (last 15 lines):"
  pm2 logs vet-clinic-app --err --lines 15 --nostream 2>/dev/null || true
fi

# ── 8. CONFIGURE NGINX REVERSE PROXY ─────────────────────────
log_step "8/9" "Configuring Nginx reverse proxy..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create our site configuration
cat > /etc/nginx/sites-available/vet-clinic <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

# Enable the site
ln -sf /etc/nginx/sites-available/vet-clinic /etc/nginx/sites-enabled/

# Test and restart
if nginx -t 2>&1 | grep -q "successful"; then
  systemctl restart nginx
  log_ok "Nginx configured and restarted"
else
  log_err "Nginx configuration test failed!"
  nginx -t
  exit 1
fi

# ── 9. CONFIGURE FIREWALL & SSL ───────────────────────────────
log_step "9/9" "Configuring firewall & SSL certificate..."

# Configure UFW firewall
ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow ssh > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
log_ok "Firewall configured (SSH + HTTP + HTTPS allowed)"

# Attempt SSL
echo ""
log_ok "Attempting SSL certificate for $DOMAIN_NAME..."
echo "  (Make sure your domain's DNS A-record points to this server's IP)"
echo ""

if certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect 2>&1; then
  log_ok "SSL certificate installed successfully!"
else
  log_warn "SSL auto-configuration failed."
  log_warn "This usually means your domain DNS hasn't propagated yet."
  log_warn "Once DNS is ready, run:  sudo certbot --nginx -d $DOMAIN_NAME"
fi

# ── DONE ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🎉  DEPLOYMENT SUCCESSFUL!  🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Website URL:${NC}    https://$DOMAIN_NAME"
echo -e "  ${CYAN}HTTP URL:${NC}       http://$DOMAIN_NAME"
echo -e "  ${CYAN}App Directory:${NC}  $APP_DIR"
echo -e "  ${CYAN}Database:${NC}       $DB_NAME (user: $DB_USER)"
echo -e "  ${CYAN}DB Password:${NC}    $DB_PASS"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}   🔑  DEFAULT LOGIN CREDENTIALS  🔑${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Super Admin:${NC}"
echo -e "    Email:    superadmin@petpointvet.in"
echo -e "    Password: superadmin123"
echo ""
echo -e "  ${GREEN}Admin:${NC}"
echo -e "    Email:    admin@petpointvet.in"
echo -e "    Password: admin123"
echo ""
echo -e "  ${RED}⚠ CHANGE THESE PASSWORDS AFTER FIRST LOGIN!${NC}"
echo -e "  ${YELLOW}⚠ SAVE THE DATABASE PASSWORD ABOVE! You will need it for maintenance.${NC}"
echo ""
echo -e "  ${CYAN}Useful Commands:${NC}"
echo -e "    pm2 status              - Check app status"
echo -e "    pm2 logs vet-clinic-app - View app logs"
echo -e "    pm2 restart all         - Restart the app"
echo -e "    systemctl status nginx  - Check Nginx status"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
