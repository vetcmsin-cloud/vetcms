#!/bin/bash
# PetPoint Pro Update Script (UI Performance Fixes)
# Run this on the VPS to update the UI performance fixes without losing data

echo "Starting PetPoint Pro Update..."

# 1. Stop the application
pm2 stop all

# 2. Extract the update over the existing files
# This overwrites application code but leaves node_modules and .env untouched
unzip -o petpoint_update_ui_perf_may18.zip

# 3. Install any new dependencies
npm install

# 4. Build the application for production
npm run build

# 5. Restart the application
pm2 restart all

echo "Update complete! The UI rendering bottlenecks have been resolved."
