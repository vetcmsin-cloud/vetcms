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
    const isHttps = VPS_URL.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(VPS_URL + '/api/mindray/webhook');

    const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
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
    }
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
    console.log(`Ready. Waiting for blood machine data...`);
});
