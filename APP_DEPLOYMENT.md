# PetPoint Pro - One-Click Deployment Guide

Deploy to a fresh **Ubuntu 22.04** Hostinger VPS in **3 simple steps**.
This is a **clean deployment** — zero patient data, only 2 system users are created.

---

## 📦 What's in deploy_vps.zip?
- `dist/`           — Built app (server + client)
- `shared/`         — Database schema
- `package.json` & `package-lock.json`
- `ecosystem.config.cjs` — PM2 process config
- `drizzle.config.ts`    — DB schema config

---

## 🚀 Step 1: Upload Files to VPS

Open **PowerShell** on your local computer and run (replace `<your-vps-ip>`):

```powershell
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy_vps.zip" root@<your-vps-ip>:/root/
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy.sh" root@<your-vps-ip>:/root/
```

## 🔗 Step 2: Connect to Your VPS

```powershell
ssh root@<your-vps-ip>
```

## ▶️ Step 3: Run the One-Click Installer

```bash
chmod +x /root/deploy.sh
/root/deploy.sh
```

The script will ask you for:
1. **Domain Name** (e.g., `app.petpointvet.in`)
2. **Admin Email** (e.g., `admin@petpointvet.in`)

Then it automatically handles **everything**:
- ✅ Installs Node.js 20, PostgreSQL, Nginx, PM2, Certbot
- ✅ Creates the database with a secure random password
- ✅ Extracts and installs the application
- ✅ Pushes the database schema (creates all tables)
- ✅ Seeds system roles & 2 admin users (zero patient data)
- ✅ Starts the app with PM2 (auto-restarts on crash/reboot)
- ✅ Configures Nginx reverse proxy
- ✅ Opens firewall ports (SSH, HTTP, HTTPS)
- ✅ Installs SSL certificate (HTTPS)

---

## 🔑 Default Login Credentials

| Role        | Email                          | Password       |
|-------------|-------------------------------|----------------|
| Super Admin | superadmin@petpointvet.in     | superadmin123  |
| Admin       | admin@petpointvet.in          | admin123       |

> ⚠️ **Change these passwords immediately after first login!**

---

## 📋 After Deployment

### Useful Commands (run on VPS via SSH)
```bash
pm2 status                # Check if app is running
pm2 logs vet-clinic-app   # View live logs
pm2 restart all           # Restart the app
systemctl status nginx    # Check Nginx status
```

---

## 🔄 Updating the App (Future Deployments)

To push code updates without losing any database data:

1. Build locally: `npm run build`
2. Re-create `deploy_vps.zip` (run the PowerShell script or manually zip `dist/`, `shared/`, `package.json`, `package-lock.json`, `ecosystem.config.cjs`, `drizzle.config.ts`)
3. Upload and run update script:
```powershell
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy_vps.zip" root@<your-vps-ip>:/root/
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\update_vps.sh" root@<your-vps-ip>:/root/
ssh root@<your-vps-ip>
```
```bash
chmod +x /root/update_vps.sh && /root/update_vps.sh
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ERR_CONNECTION_TIMED_OUT` | DNS not pointing to VPS IP. Run `ufw allow 'Nginx Full'` |
| `502 Bad Gateway` | App crashed. Run `pm2 logs vet-clinic-app` to see why |
| `Welcome to Nginx` page | Run `rm /etc/nginx/sites-enabled/default && systemctl restart nginx` |
| SSL failed | DNS not propagated yet. Wait 5-10 min, then run `certbot --nginx -d your_domain.com` |
