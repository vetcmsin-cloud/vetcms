#!/bin/bash
# ============================================================
#   PetPoint Pro - ONE-CLICK VPS Deployment Script (Standalone)
#   Tested on Ubuntu 22.04 (Hostinger VPS)
#   Run as root: chmod +x deploy_standalone.sh && ./deploy_standalone.sh
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
  log_err "Please run this script as root: sudo ./deploy_standalone.sh"
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
DB_USER="vet_standalone"
DB_NAME="db_standalone"
APP_DIR="/var/www/vetcms_standalone"
APP_PORT="5001"
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
  cp -r "$APP_DIR/server/uploads" /tmp/vet_uploads_backup_standalone 2>/dev/null || true
fi

# Extract fresh
unzip -o "$DEPLOY_ZIP" -d "$APP_DIR" > /dev/null 2>&1
log_ok "Application extracted to $APP_DIR"

# Restore uploads if backed up
if [ -d "/tmp/vet_uploads_backup_standalone" ]; then
  cp -r /tmp/vet_uploads_backup_standalone/* "$APP_DIR/server/uploads/" 2>/dev/null || true
  rm -rf /tmp/vet_uploads_backup_standalone
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
PORT=$APP_PORT
SESSION_SECRET=$SESSION_SECRET
EOF

log_ok ".env file created with port $APP_PORT"

# Overwrite PM2 config to set unique name and port
cat > "$APP_DIR/ecosystem.config.cjs" <<EOF
module.exports = {
    apps: [{
        name: "vet-standalone-app",
        script: "dist/index.cjs",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",
        env: {
            NODE_ENV: "production",
            PORT: $APP_PORT,
        },
    }],
};
EOF
log_ok "PM2 config rewritten for vet-standalone-app"

# Install dependencies
cd "$APP_DIR"
npm ci > /dev/null 2>&1
log_ok "npm dependencies installed"

# Push database schema using drizzle
log_ok "Pushing database schema..."
npx drizzle-kit push 2>&1 > /dev/null
log_ok "Database schema synced"

# Clean up dev dependencies
npm prune --omit=dev > /dev/null 2>&1

# ── 7. START APPLICATION WITH PM2 ────────────────────────────
log_step "7/9" "Starting application with PM2..."

# Stop any existing instance
pm2 stop vet-standalone-app 2>/dev/null || true
pm2 delete vet-standalone-app 2>/dev/null || true

# Start the app
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
log_ok "PM2 started the application"

# Wait 4 seconds for the app to initialize
sleep 4

# Save PM2 state for auto-restart on reboot
pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
log_ok "PM2 configured for auto-restart on reboot"

# Verify the app responds
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT | grep -qE "200|301|302"; then
  log_ok "App responding on port $APP_PORT ✓"
else
  CURL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT 2>/dev/null || echo "000")
  log_warn "App returned HTTP $CURL_CODE on port $APP_PORT (might still be starting)"
fi

# ── 8. CONFIGURE NGINX REVERSE PROXY ─────────────────────────
log_step "8/9" "Configuring Nginx reverse proxy..."

# Create our site configuration
cat > /etc/nginx/sites-available/vet-standalone <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:$APP_PORT;
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
ln -sf /etc/nginx/sites-available/vet-standalone /etc/nginx/sites-enabled/

# Test and restart
if nginx -t 2>&1 | grep -q "successful"; then
  systemctl restart nginx
  log_ok "Nginx configured and restarted"
else
  log_err "Nginx configuration test failed!"
fi

# ── 9. CONFIGURE FIREWALL & SSL ───────────────────────────────
log_step "9/9" "Configuring firewall & SSL certificate..."

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
echo -e "${GREEN}   🎉  DEPLOYMENT SUCCESSFUL (vetcms_standalone)!  🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${CYAN}Website URL:${NC}    https://$DOMAIN_NAME"
echo -e "  ${CYAN}App Directory:${NC}  $APP_DIR"
echo -e "  ${CYAN}Database:${NC}       $DB_NAME (user: $DB_USER)"
echo -e "  ${CYAN}DB Password:${NC}    $DB_PASS"
echo -e "  ${CYAN}App Port:${NC}       $APP_PORT"
echo ""
echo -e "  ${GREEN}Super Admin:${NC}    superadmin@petpointvet.in / superadmin123"
echo -e "  ${GREEN}Admin:${NC}          admin@petpointvet.in / admin123"
echo ""
echo -e "  ${CYAN}Useful Commands:${NC}"
echo -e "    pm2 logs vet-standalone-app"
echo -e "    pm2 restart vet-standalone-app"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
