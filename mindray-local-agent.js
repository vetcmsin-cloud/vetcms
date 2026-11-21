/**
 * PetPointPro Local Mindray Agent
 * 
 * This script runs on the local Windows desktop in the clinic.
 * It listens for raw HL7 messages from the Mindray BC-20s on the local LAN
 * and securely forwards them to your PetPointPro VPS server over HTTPS.
 * 
 * Requirements: Node.js installed on the clinic desktop.
 * Run with: node mindray-local-agent.js
 */

const net = require('net');
const http = require('http');
const https = require('https');

// --- CONFIGURATION ---
// Change this to your actual VPS domain, e.g., 'https://myclinic.petpointpro.com'
const VPS_URL = 'http://localhost:5000'; // Update this to your deployed VPS URL!
const LOCAL_PORT = 5100;

// HL7 control characters
const ENQ = 0x05;
const ACK = 0x06;
const EOT = 0x04;
const ETX = 0x03;
const LF = 0x0A;

console.log('🐾 PetPointPro Local Mindray Agent');
console.log('====================================');
console.log(`Forwarding results to: ${VPS_URL}`);
console.log(`Listening for Mindray on local port: ${LOCAL_PORT}\n`);

// Forward data to VPS
function sendToVPS(hl7String) {
    const payload = JSON.stringify({ hl7Data: hl7String });
    
    // Normalize VPS_URL to prevent double slashes and parsing issues
    const normalizedVpsUrl = VPS_URL.replace(/\/$/, '');
    const urlObj = new URL(normalizedVpsUrl + '/api/mindray/webhook');
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    // Support disabling strict SSL check (useful for self-signed certificates in clinic environments)
    if (isHttps && (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || process.env.IGNORE_SSL === 'true')) {
        options.rejectUnauthorized = false;
        console.log('[Warning] Connecting to VPS with strict SSL verification disabled');
    }

    const req = client.request(urlObj, options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`[Success] Results securely forwarded to VPS!`);
            } else {
                console.error(`[Error] VPS rejected data: ${res.statusCode} - ${responseBody}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[Error] Could not connect to VPS: ${e.message}`);
        console.error(`Please verify that:`);
        console.error(`  1. The server at ${VPS_URL} is online and running.`);
        console.error(`  2. The network connection is active.`);
        console.error(`  3. If your server is local, check the IP address. If it uses a self-signed HTTPS certificate, run with: env IGNORE_SSL=true node mindray-local-agent.js`);
    });

    req.write(payload);
    req.end();
}

// Start the TCP Listener
const server = net.createServer((socket) => {
    let dataBuffer = '';
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Local Link] Mindray connected from ${clientAddr}`);

    socket.on('data', (chunk) => {
        const bytes = Buffer.from(chunk);

        // ENQ
        if (bytes[0] === ENQ) {
            socket.write(Buffer.from([ACK]));
            return;
        }

        // EOT (End of overall transmission)
        if (bytes[0] === EOT) {
            console.log(`[Local Link] Mindray finished transmission.`);
            if (dataBuffer.trim().length > 0) {
                console.log(`[Local Link] Forwarding ${dataBuffer.length} characters to VPS...`);
                sendToVPS(dataBuffer);
                dataBuffer = ''; // Reset
            }
            return;
        }

        // Buffer text
        const text = chunk.toString('utf-8');
        dataBuffer += text;

        // ACK each data block
        if (text.includes('\r') || bytes.includes(ETX) || bytes.includes(LF)) {
            socket.write(Buffer.from([ACK]));
            // Also process if it seems like a complete message without an explicit EOT
            if (dataBuffer.includes('MSH') || dataBuffer.length > 100) {
                console.log(`[Local Link] Block received. Proceeding...`);
            }
        }
    });

    socket.on('end', () => {
        console.log(`[Local Link] Mindray disconnected.`);
        if (dataBuffer.trim().length > 0) {
            console.log(`[Local Link] Forwarding ${dataBuffer.length} characters to VPS...`);
            sendToVPS(dataBuffer);
            dataBuffer = '';
        }
    });

    socket.on('error', (err) => {
        console.error(`[Local Link] Connection error: ${err.message}`);
    });
});

server.on('error', (err) => {
    console.error(`[Error] TCP Server Error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${LOCAL_PORT} is already in use by another program.`);
        console.error(`NOTE: If you are running the PetPointPro server LOCALLY on this same PC, the built-in HL7 listener is already running on port ${LOCAL_PORT}.`);
        console.error(`You do NOT need to run this local agent script! The machine can connect directly to this PC's local IP address.`);
    }
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
    console.log(`Ready. Waiting for blood machine data...`);
});
