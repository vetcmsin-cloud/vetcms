# ============================================================
# PetPoint Pro - VPS Update Commands
# Run these ONE AT A TIME in PowerShell
# Replace YOUR_VPS_IP with your actual VPS IP address
# ============================================================

# ------ STEP 1: Set your VPS IP (change this!) ------
$VPS_IP = "YOUR_VPS_IP"

# ------ STEP 2: Upload the new zip and force_update script ------
scp "petpoint_update_zz_inventory_fix.zip" "root@${VPS_IP}:/root/"
scp "force_update.sh" "root@${VPS_IP}:/root/"
scp "update_vps.sh" "root@${VPS_IP}:/root/"

# ------ STEP 3: SSH in and run the force update ------
ssh "root@${VPS_IP}" "chmod +x /root/force_update.sh && bash /root/force_update.sh"
