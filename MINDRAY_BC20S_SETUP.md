# Mindray BC-20s Connection Guide

## How to Connect Your Mindray BC-20s Hematology Analyzer

This guide explains how to connect your Mindray BC-20s machine to PetPointPro for automatic CBC result capture.

---

## Method 1: Direct LAN Connection (Recommended — 100% Accurate)

### What You Need
- Ethernet cable (RJ45)
- Your Mindray BC-20s machine
- The PC/server running PetPointPro

### Step 1: Physical Connection
Connect an Ethernet cable from the **LAN port** on the back of the Mindray BC-20s to your local network (router/switch). Both the machine and your PetPointPro server must be on the same network.

### Step 2: Configure the Mindray BC-20s
On the Mindray BC-20s machine:

1. Press **Menu** → **Communication** → **Setup**
2. Set **Communication Mode** to: **HL7**
3. Set **Port** to: **LAN Port**
4. Configure the **Server IP Address**: Enter the IP address of the PC running PetPointPro
   - To find your PC's IP: Open Command Prompt → type `ipconfig` → note the IPv4 Address
5. Set **Server Port** to: **5100**
6. Set **Protocol** to: **HL7**
7. Enable **Auto Send** to automatically transmit results after each sample analysis
8. Press **Save/Confirm**

### Step 3: Test the Connection
1. Start PetPointPro (the HL7 listener starts automatically on port 5100)
2. Run a sample on the Mindray BC-20s
3. The machine will send the results to PetPointPro
4. In PetPointPro, go to a pet's Lab Reports → Add Report → Hematology 
5. Click the green **"Receive from Machine"** button
6. All CBC values will be automatically filled in!

### Troubleshooting
- **No data received**: Check that the machine's IP settings match your server's IP
- **Connection refused**: Make sure port 5100 is not blocked by Windows Firewall
  - Run in PowerShell (as Admin): `New-NetFirewallRule -DisplayName "PetPointPro HL7" -Direction Inbound -LocalPort 5100 -Protocol TCP -Action Allow`
- **Multiple samples**: The system stores the last 50 results. Click "Receive from Machine" to get the most recent one.

---

## Method 1B: VPS Cloud Deployment via Local Relay Agent

Since your PetPointPro application is hosted on a cloud VPS server, the Mindray machine (on your local clinic network) cannot directly transmit results to it via the TCP IP. Instead, you'll run a lightweight **Local Relay Agent** on the clinic's Windows desktop.

### 1. The Relay Agent Script
We have created a file named `mindray-local-agent.js` in your project folder. This little script does two things:
1. It listens on your local clinic desktop for the Mindray machine exactly as if it was the server itself (Port 5100).
2. As soon as a blood result comes in, it instantly encapsulates the data and uploads it securely over HTTPS to your Cloud Web App via a Webhook.

### 2. Prepare the Relay Script for Your VPS
1. Open the file `mindray-local-agent.js` using any text editor on your clinic desktop.
2. Find line 13: `const VPS_URL = 'http://localhost:5000';`
3. Change it to your actual **VPS Domain URL** (e.g., `const VPS_URL = 'https://petpointpro.myclinic.com';`). Save the file.

### 3. Run the Relay Agent on the Clinic Desktop
1. Ensure **Node.js** is installed on the desktop computer that is connected to the same router as the Mindray device.
2. Open Command Prompt (`cmd`) or PowerShell on that desktop.
3. Type: `node mindray-local-agent.js`
4. You should see a message saying "Ready. Waiting for blood machine data..."

### 4. Configure Mindray Device
Follow **Step 2: Configure the Mindray BC-20s** from Method 1 above. 
But for the **Server IP Address**, enter the **Local Network IP of your Clinic Desktop**, *not* the VPS server IP.

Now, whenever you run a blood sample, the Mindray machine will send it to your desktop via the switch/router, the Relay Agent will catch it, and securely POST it into your VPS instance in the cloud. You can immediately click "Receive From Machine" in PetPointPro.

---

## Method 2: Image Scan (Fallback)

If direct LAN connection is not possible, you can still use the photo scan feature:

1. Take a clear photo of the Mindray BC-20s display
2. In PetPointPro → Lab Reports → Add Report → Hematology
3. Click **"Scan CBC (Photo)"**
4. Select/take the photo
5. OCR will attempt to extract the values

### Tips for Better OCR Accuracy
- Take the photo **straight-on** (no angle)
- Ensure **even lighting** with no glare/reflections on the screen
- Hold the camera **steady** — no blur
- Crop the photo to show **only the results table** area
- The OCR works best with **high resolution** photos

---

## API Endpoints (for advanced users)

| Endpoint | Method | Description |
|---|---|---|
| `/api/mindray/status` | GET | Check if HL7 listener is running |
| `/api/mindray/start` | POST | Start the listener (body: `{ "port": 5100 }`) |
| `/api/mindray/stop` | POST | Stop the listener |
| `/api/mindray/latest` | GET | Get the most recent CBC result |
| `/api/mindray/results` | GET | Get all stored results (up to 50) |
| `/api/mindray/results` | DELETE | Clear all stored results |
| `/api/mindray/manual` | POST | Manually add a result for testing |

### Manual Test Example (PowerShell)
```powershell
# Simulate a CBC result for testing
Invoke-RestMethod -Uri "http://localhost:5000/api/mindray/manual" -Method POST -ContentType "application/json" -Body '{"sampleId":"TEST001","data":{"wbc":"28.90","rbc":"4.41","hb":"10.7","pcv":"37.0","mcv":"84.0","mch":"24.4","mchc":"29.0","platelet":"1719","neutrophils":"75.5","lymphocytes":"11.6","monocytes":"10.4","eosinophils":"2.5"}}'
```
