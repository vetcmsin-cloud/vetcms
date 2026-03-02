# PetPoint Pro - One-Click Deployment Guide

Deploy your veterinary clinic management app to any fresh Ubuntu VPS in **3 simple steps**.

## Prerequisites
- A VPS running **Ubuntu 22.04** (e.g., Hostinger VPS)
- SSH access to your VPS (root user)
- Your **domain name** already pointing (DNS A-record) to your VPS IP address

---

## Step 1: Upload Files to VPS

Open **PowerShell** on your local computer and run these two commands (replace `<your-vps-ip>` with your actual VPS IP):

```powershell
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy_vps.zip" root@<your-vps-ip>:/root/
scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy.sh" root@<your-vps-ip>:/root/
```

## Step 2: Connect to Your VPS

```powershell
ssh root@<your-vps-ip>
```

## Step 3: Run the One-Click Installer

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
- ✅ Extracts and installs your application
- ✅ Pushes the database schema (tables)
- ✅ Starts the app with PM2 (auto-restarts on crash/reboot)
- ✅ Configures Nginx reverse proxy
- ✅ Opens firewall ports (SSH, HTTP, HTTPS)
- ✅ Installs SSL certificate (HTTPS)

At the end, it prints your **database password** — save it somewhere safe!

---

## After Deployment

### Useful Commands (run on VPS via SSH)
```bash
pm2 status                # Check if app is running
pm2 logs vet-clinic-app   # View live logs
pm2 restart all           # Restart the app
systemctl status nginx    # Check Nginx status
```

### Safely Updating the App (Future Deployments)
To push new updates to your live server without losing any database records, uploaded images, or configurations:

1. Build the app locally: `npm run build`
2. Create `deploy_vps.zip` and ensure it includes the following files & folders:
   - `dist/` (your built app)
   - `shared/` (your database schema)
   - `package.json` & `package-lock.json`
   - `ecosystem.config.cjs`
   - `drizzle.config.ts`
3. Use PowerShell to upload both the zip and the update script:
   ```powershell
   scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy_vps.zip" root@<your-vps-ip>:/root/
   scp "c:\Users\HOME\Desktop\Vetinary Clinic Management\update_vps.sh" root@<your-vps-ip>:/root/
   ```
4. Connect via SSH (`ssh root@<your-vps-ip>`)
5. Run the update safely:
   ```bash
   chmod +x /root/update_vps.sh
   /root/update_vps.sh
   ```
   *This script automatically backs up your images and database password, extracts the new code, runs database schema upgrades safely, and restarts the live web server!*

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ERR_CONNECTION_TIMED_OUT` | DNS not pointing to VPS IP, or firewall blocking. Run `ufw allow 'Nginx Full'` |
| `502 Bad Gateway` | App crashed. Run `pm2 logs vet-clinic-app` to see why |
| `Welcome to Nginx` page | Default site still enabled. Run `rm /etc/nginx/sites-enabled/default && systemctl restart nginx` |
| SSL failed | DNS not propagated yet. Wait 5-10 min, then run `certbot --nginx -d your_domain.com` |
