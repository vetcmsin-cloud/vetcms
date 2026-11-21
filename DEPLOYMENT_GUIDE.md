# 🐾 PetPoint Pro — VPS Deployment & Update Guide

> This document covers both **fresh installations** and **zero-downtime updates** on a Hostinger Ubuntu VPS.

---

## 📋 Prerequisites

| Item | Detail |
|------|--------|
| VPS OS | Ubuntu 22.04 LTS |
| VPS RAM | 1 GB minimum (2 GB recommended) |
| VPS Storage | 10 GB minimum |
| Local OS | Windows (PowerShell) |
| SSH Access | `root@<your-vps-ip>` |

---

## ──────────────────────────────────────────
## PART A — FRESH INSTALL (First time only)
## ──────────────────────────────────────────

### Step 1 — Build the App Locally

Open **PowerShell** in the project folder and run:

```powershell
cd "c:\Users\HOME\Desktop\Vetinary Clinic Management"
npm run build
```

Wait for both `building client...` and `building server...` to complete (≈ 60 seconds).

---

### Step 2 — Create the Deployment Zip

Run the PowerShell script:

```powershell
powershell -ExecutionPolicy Bypass -File .\create_zip.ps1
```

This creates `petpoint_update_zz_inventory_fix.zip` (or the most recent `petpoint_update_*.zip`) in the project folder.

---

### Step 3 — Upload Files to VPS

Replace `<your-vps-ip>` with your actual server IP:

```powershell
# Upload the app zip
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\petpoint_update_appointment_id.zip" root@<your-vps-ip>:/root/

# Upload the deployment shell script
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy.sh" root@<your-vps-ip>:/root/
```

---

### Step 4 — SSH Into the VPS

```powershell
ssh root@<your-vps-ip>
```

---

### Step 5 — Run the One-Click Installer

```bash
chmod +x /root/deploy.sh
bash /root/deploy.sh
```

You will be prompted for:
1. **Domain Name** — e.g., `app.petpointvet.in`
2. **Admin Email** — e.g., `admin@petpointvet.in`

The script automatically:
- ✅ Installs Node.js 20, PostgreSQL, Nginx, PM2, Certbot
- ✅ Creates the database with a secure random password
- ✅ Extracts and installs the application to `/var/www/vet-clinic`
- ✅ Pushes the database schema (creates all tables)
- ✅ Seeds system roles & admin users
- ✅ Starts the app with PM2 (auto-restarts on crash/reboot)
- ✅ Configures Nginx reverse proxy
- ✅ Opens firewall ports (SSH, HTTP, HTTPS)
- ✅ Installs SSL certificate (HTTPS)

---

### 🔑 Default Login Credentials

| Role        | Email                      | Password       |
|-------------|---------------------------|----------------|
| Super Admin | superadmin@petpointvet.in | superadmin123  |
| Admin       | admin@petpointvet.in      | admin123       |

> ⚠️ **Change these passwords immediately after first login!**

---

## ──────────────────────────────────────────
## PART B — UPDATING THE APP (Zero Data Loss)
## ──────────────────────────────────────────

Use this whenever you push new features or bug fixes to the running VPS.
**No database data is ever lost** — only the `dist/` folder is replaced.

---

### Step 1 — Build Locally

```powershell
cd "c:\Users\HOME\Desktop\Vetinary Clinic Management"
npm run build
```

---

### Step 2 — Create the Update Zip

```powershell
powershell -ExecutionPolicy Bypass -File .\create_zip.ps1
```

The zip is created as `petpoint_update_zz_inventory_fix.zip` (rename it if you prefer a descriptive name).

---

### Step 3 — Upload the Update Files to VPS

```powershell
# Upload the newest update zip
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\petpoint_update_appointment_id.zip" root@<your-vps-ip>:/root/

# Upload the update shell script (only needed if it changed)
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\update_vps.sh" root@<your-vps-ip>:/root/
```

---

### Step 4 — SSH Into the VPS

```powershell
ssh root@<your-vps-ip>
```

---

### Step 5 — Run the Update Script

```bash
chmod +x /root/update_vps.sh
bash /root/update_vps.sh
```

The script will:
1. Detect the newest `petpoint_update_*.zip` automatically
2. Stop the running PM2 app
3. Backup the current `dist/` folder with a timestamp
4. Extract and replace `dist/` with fresh build files
5. Restart the PM2 app
6. Print live status & recent logs

A successful run looks like:

```
================================================
 PetPoint Pro Update
 Package  : /root/petpoint_update_appointment_id.zip
 App Dir  : /var/www/vet-clinic
 PM2 Name : vet-clinic-app
================================================
Stopping vet-clinic-app ...
Backing up current dist to /var/www/vet-clinic/dist_backup_20260410_0100
Extracting ...
Replacing dist files...
Restarting vet-clinic-app ...

=== STATUS ===
┌─ id ─┬─ name ──────────┬─ status ──┬─ cpu ─┬─ mem ──┐
│ 0    │ vet-clinic-app  │ online    │ 0%    │ 120mb  │
└──────┴─────────────────┴───────────┴───────┴────────┘

Update complete!
```

---

## ──────────────────────────────────────────
## PART C — VPS MANAGEMENT COMMANDS
## ──────────────────────────────────────────

Run these on the VPS (via SSH) as needed:

```bash
# Check if the app is running
pm2 status

# View live logs (Ctrl+C to exit)
pm2 logs vet-clinic-app

# View last 50 lines of logs
pm2 logs vet-clinic-app --lines 50 --nostream

# Restart the app manually
pm2 restart vet-clinic-app

# Stop the app
pm2 stop vet-clinic-app

# Start the app if not running
cd /var/www/vet-clinic && pm2 start ecosystem.config.cjs

# Check Nginx status
systemctl status nginx

# Reload Nginx (after config changes)
systemctl reload nginx

# Check free disk space
df -h

# Check memory usage
free -h

# View the app's environment variables
cat /var/www/vet-clinic/.env
```

---

## ──────────────────────────────────────────
## PART D — TROUBLESHOOTING
## ──────────────────────────────────────────

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ERR_CONNECTION_TIMED_OUT` | DNS not pointing to VPS IP | Check DNS A record; run `ufw allow 'Nginx Full'` |
| `502 Bad Gateway` | App crashed or not running | `pm2 logs vet-clinic-app --lines 50 --nostream` |
| `Welcome to Nginx` page | Wrong Nginx default site | `rm /etc/nginx/sites-enabled/default && systemctl restart nginx` |
| SSL cert failure | DNS not propagated | Wait 10 min, then run `certbot --nginx -d your_domain.com` |
| App shows old version | PM2 cached previous build | `pm2 restart vet-clinic-app` |
| `Cannot find module` error | node_modules missing | `cd /var/www/vet-clinic && npm install --omit=dev` |
| Database connection error | Wrong credentials in `.env` | `nano /var/www/vet-clinic/.env` and fix `DATABASE_URL` |
| Port 5000 already in use | Old process still running | `pm2 kill && pm2 start ecosystem.config.cjs` |

---

## ──────────────────────────────────────────
## PART E — FILE LOCATIONS ON THE VPS
## ──────────────────────────────────────────

```
/var/www/vet-clinic/
├── dist/                   ← Built app (replaced on each update)
│   ├── index.cjs           ← Server bundle
│   └── public/             ← React frontend assets
├── shared/                 ← Database schema (for migrations)
├── .env                    ← Environment variables (DATABASE_URL, PORT)
├── ecosystem.config.cjs    ← PM2 process configuration
├── package.json            ← App metadata & dependencies
└── dist_backup_YYYYMMDD/   ← Automatic backup created before each update
```

---

## ──────────────────────────────────────────
## PART F — QUICK REFERENCE CHECKLIST
## ──────────────────────────────────────────

### ✅ Before Every Update (Local Machine)
- [ ] All code changes are saved
- [ ] `npm run build` completes with Exit code: 0
- [ ] `create_zip.ps1` produces a valid zip file

### ✅ After Every Update (VPS)
- [ ] `pm2 status` shows `online`
- [ ] App loads in browser
- [ ] No errors in `pm2 logs vet-clinic-app --lines 20 --nostream`
- [ ] Test the specific feature that was changed

---

*Last updated: April 2026 — PetPoint Pro v1.0*
