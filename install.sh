#!/bin/bash
echo "Starting Vet Clinic App Setup..."

# 1. Install dependencies
echo "Installing Node.js dependencies..."
npm install --omit=dev

# 2. Setup environment variables
if [ ! -f .env ]; then
    echo "============================================="
    echo "No .env file found. Let's create one!"
    echo "============================================="
    echo "Enter your PostgreSQL database password for 'vet_admin':"
    read -s DB_PASS
    
    # Generate a random string for the session secret
    SECRET=$(openssl rand -hex 32)
    
    echo "DATABASE_URL=postgresql://vet_admin:$DB_PASS@localhost:5432/vet_clinic" > .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=5000" >> .env
    echo "SESSION_SECRET=$SECRET" >> .env
    echo "Created .env file successfully."
else
    echo ".env file already exists. Skipping creation."
fi

# 3. Push Database Schema
echo "Syncing database schema..."
npx drizzle-kit push

# 4. Setup PM2
echo "Configuring PM2 to keep the app running 24/7..."
# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo "============================================="
echo "Setup Complete!"
echo "Your application is now running on port 5000."
echo "If you have NGINX configured, it should now be accessible via your domain."
echo "============================================="
