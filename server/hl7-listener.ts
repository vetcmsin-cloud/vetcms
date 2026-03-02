/**
 * HL7 / Mindray BC-20s Data Receiver
 * 
 * This module creates a TCP server that listens for data from the Mindray BC-20s
 * hematology analyzer. It supports:
 * 
 * 1. HL7 protocol (ORU^R01 messages) — used when sample IDs are up to 20 digits
 * 2. Raw/8ID/10ID protocol — used when sample IDs are up to 8-10 digits
 * 
 * The machine sends CBC results over LAN (Ethernet) or serial-to-TCP adapter.
 * 
 * Connection flow:
 *   Machine → ENQ → Server ACK → Machine sends data → Server ACK → Machine EOT
 */

import * as net from 'net';

// HL7 control characters
const ENQ = 0x05;   // Enquiry
const ACK = 0x06;   // Acknowledge 
const NAK = 0x15;   // Negative Acknowledge
const STX = 0x02;   // Start of Text
const ETX = 0x03;   // End of Text
const EOT = 0x04;   // End of Transmission
const CR = 0x0D;   // Carriage Return
const LF = 0x0A;   // Line Feed

// Mindray BC-20s CBC parameter OBX identifiers
// Maps the OBX observation identifier to our internal key
const MINDRAY_OBX_MAP: Record<string, string> = {
    // Standard HL7 codes used by Mindray
    'WBC': 'wbc',
    '6690-2': 'wbc',
    'RBC': 'rbc',
    '789-8': 'rbc',
    'HGB': 'hb',
    '718-7': 'hb',
    'HCT': 'pcv',
    '4544-3': 'pcv',
    'MCV': 'mcv',
    '787-2': 'mcv',
    'MCH': 'mch',
    '785-6': 'mch',
    'MCHC': 'mchc',
    '786-4': 'mchc',
    'PLT': 'platelet',
    '777-3': 'platelet',
    'RDW-CV': 'rdwCv',
    'RDW-SD': 'rdwSd',
    'MPV': 'mpv',
    'PDW': 'pdw',
    'PCT': 'pct',
    'P-LCC': 'plcc',
    'P-LCR': 'plcr',
    // Differential counts (absolute)
    'Neu#': 'neutrophilsAbs',
    'NEU#': 'neutrophilsAbs',
    'NEUT#': 'neutrophilsAbs',
    'Lym#': 'lymphocytesAbs',
    'LYM#': 'lymphocytesAbs',
    'Mon#': 'monocytesAbs',
    'MON#': 'monocytesAbs',
    'MONO#': 'monocytesAbs',
    'Eos#': 'eosinophilsAbs',
    'EOS#': 'eosinophilsAbs',
    'Bas#': 'basophilsAbs',
    'BAS#': 'basophilsAbs',
    // Differential counts (percentage)
    'Neu%': 'neutrophils',
    'NEU%': 'neutrophils',
    'NEUT%': 'neutrophils',
    'Lym%': 'lymphocytes',
    'LYM%': 'lymphocytes',
    'Mon%': 'monocytes',
    'MON%': 'monocytes',
    'MONO%': 'monocytes',
    'Eos%': 'eosinophils',
    'EOS%': 'eosinophils',
    'Bas%': 'basophils',
    'BAS%': 'basophils',
};

export interface MindrayCBCResult {
    timestamp: string;
    sampleId: string;
    patientName: string;
    species: string;
    data: Record<string, string>;
    rawMessage: string;
}

// Store the most recent results (last 50)
const recentResults: MindrayCBCResult[] = [];
const MAX_STORED_RESULTS = 50;

/** Get all recent results */
export function getRecentResults(): MindrayCBCResult[] {
    return [...recentResults];
}

/** Get the latest result only */
export function getLatestResult(): MindrayCBCResult | null {
    return recentResults.length > 0 ? recentResults[0] : null;
}

/** Clear all stored results */
export function clearResults(): void {
    recentResults.length = 0;
}

/** Parse an HL7 message string into segments */
function parseHL7Message(raw: string): Record<string, string[][]> {
    const segments: Record<string, string[][]> = {};
    const lines = raw.split(/[\r\n]+/).filter(l => l.trim().length > 0);

    for (const line of lines) {
        // Determine field separator from MSH segment
        let fieldSep = '|';
        if (line.startsWith('MSH')) {
            fieldSep = line[3] || '|';
        }

        const fields = line.split(fieldSep);
        const segName = fields[0];

        if (!segments[segName]) {
            segments[segName] = [];
        }
        segments[segName].push(fields);
    }

    return segments;
}

/** Extract CBC data from an HL7 ORU^R01 message */
function extractCBCFromHL7(raw: string): MindrayCBCResult | null {
    try {
        const segments = parseHL7Message(raw);

        const result: MindrayCBCResult = {
            timestamp: new Date().toISOString(),
            sampleId: '',
            patientName: '',
            species: '',
            data: {},
            rawMessage: raw,
        };

        // Extract patient info from PID segment
        if (segments['PID'] && segments['PID'].length > 0) {
            const pid = segments['PID'][0];
            // PID-3: Patient ID
            if (pid[3]) result.sampleId = pid[3].split('^')[0] || '';
            // PID-5: Patient Name
            if (pid[5]) result.patientName = pid[5].replace(/\^/g, ' ').trim();
        }

        // Extract sample ID from OBR if not in PID
        if (segments['OBR'] && segments['OBR'].length > 0) {
            const obr = segments['OBR'][0];
            // OBR-3: Filler Order Number (often the sample number)
            if (obr[3] && !result.sampleId) {
                result.sampleId = obr[3].split('^')[0] || '';
            }
        }

        // Extract results from OBX segments
        if (segments['OBX']) {
            for (const obx of segments['OBX']) {
                // OBX-3: Observation Identifier (e.g., "WBC^WBC^99MRC")
                const obsId = obx[3] || '';
                const idParts = obsId.split('^');
                const paramCode = idParts[0] || idParts[1] || '';

                // OBX-5: Observation Value
                const value = obx[5] || '';

                // OBX-6: Units
                const unit = obx[6] || '';

                // OBX-8: Abnormal flags (H/L/N)
                const flag = obx[8] || '';

                // Map to our internal key
                const key = MINDRAY_OBX_MAP[paramCode];
                if (key && value) {
                    result.data[key] = value;
                }
            }
        }

        if (Object.keys(result.data).length === 0) {
            return null;
        }

        return result;
    } catch (err) {
        console.error('[HL7] Failed to parse HL7 message:', err);
        return null;
    }
}

/**
 * Parse raw Mindray 8ID/10ID protocol data
 * Format is typically: STX + data blocks with parameter=value pairs + ETX
 */
function extractCBCFromRaw(raw: string): MindrayCBCResult | null {
    try {
        const result: MindrayCBCResult = {
            timestamp: new Date().toISOString(),
            sampleId: '',
            patientName: '',
            species: '',
            data: {},
            rawMessage: raw,
        };

        // Try to find parameter-value patterns in the raw data
        // Mindray often sends data like: "WBC    28.90  10^3/uL"
        const lines = raw.split(/[\r\n]+/);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Try pattern: PARAM_NAME  [H|L]  VALUE  UNIT
            for (const [paramCode, key] of Object.entries(MINDRAY_OBX_MAP)) {
                // Match the parameter at the start of a line or after whitespace
                const regex = new RegExp(
                    `\\b${paramCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([HL]\\s+)?([0-9]+\\.?[0-9]*)`,
                    'i'
                );
                const match = trimmed.match(regex);
                if (match && match[2]) {
                    result.data[key] = match[2];
                }
            }

            // Try to extract sample ID
            const sampleMatch = trimmed.match(/(?:Sample|ID|No)[:\s]+(\d+)/i);
            if (sampleMatch) {
                result.sampleId = sampleMatch[1];
            }
        }

        if (Object.keys(result.data).length === 0) {
            return null;
        }

        return result;
    } catch (err) {
        console.error('[HL7] Failed to parse raw data:', err);
        return null;
    }
}

/** Store a result */
function storeResult(result: MindrayCBCResult): void {
    recentResults.unshift(result);
    if (recentResults.length > MAX_STORED_RESULTS) {
        recentResults.pop();
    }
    console.log(`[HL7] Stored CBC result. Sample ID: ${result.sampleId || 'unknown'}, Parameters: ${Object.keys(result.data).length}`);
    console.log('[HL7] Data:', JSON.stringify(result.data, null, 2));
}

// Connection state tracking
let listenerServer: net.Server | null = null;
let isListening = false;

/** Start the HL7 TCP listener server */
export function startHL7Listener(port: number = 5100): net.Server {
    if (listenerServer && isListening) {
        console.log(`[HL7] Listener already running on port ${port}`);
        return listenerServer;
    }

    listenerServer = net.createServer((socket) => {
        let dataBuffer = '';
        const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[HL7] Connection from ${clientAddr}`);

        socket.on('data', (chunk) => {
            const bytes = Buffer.from(chunk);

            // Handle ENQ (connection request)
            if (bytes[0] === ENQ) {
                console.log(`[HL7] Received ENQ from ${clientAddr} - sending ACK`);
                socket.write(Buffer.from([ACK]));
                return;
            }

            // Handle EOT (end of transmission)
            if (bytes[0] === EOT) {
                console.log(`[HL7] Received EOT from ${clientAddr} - transmission complete`);

                // Process any buffered data
                if (dataBuffer.trim().length > 0) {
                    processReceivedData(dataBuffer);
                    dataBuffer = '';
                }
                return;
            }

            // Accumulate data
            const text = chunk.toString('utf-8');
            dataBuffer += text;

            // Check if we have a complete message (ends with CR or ETX)
            if (text.includes('\r') || bytes.includes(ETX) || bytes.includes(LF)) {
                // Send ACK for each data block received
                socket.write(Buffer.from([ACK]));

                // If buffer seems complete (has MSH...or enough data), process it
                if (dataBuffer.includes('MSH') || dataBuffer.length > 100) {
                    processReceivedData(dataBuffer);
                    dataBuffer = '';
                }
            }
        });

        socket.on('end', () => {
            console.log(`[HL7] Connection closed from ${clientAddr}`);
            // Process any remaining data
            if (dataBuffer.trim().length > 0) {
                processReceivedData(dataBuffer);
                dataBuffer = '';
            }
        });

        socket.on('error', (err) => {
            console.error(`[HL7] Socket error from ${clientAddr}:`, err.message);
        });
    });

    listenerServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[HL7] Port ${port} is already in use. Trying port ${port + 1}...`);
            setTimeout(() => startHL7Listener(port + 1), 1000);
        } else {
            console.error('[HL7] Server error:', err);
        }
    });

    listenerServer.listen(port, '0.0.0.0', () => {
        isListening = true;
        console.log(`[HL7] 🔬 Mindray BC-20s listener started on port ${port}`);
        console.log(`[HL7] Configure your Mindray BC-20s to send data to this IP on port ${port}`);
    });

    return listenerServer;
}

/** Stop the HL7 listener */
export function stopHL7Listener(): void {
    if (listenerServer) {
        listenerServer.close();
        listenerServer = null;
        isListening = false;
        console.log('[HL7] Listener stopped');
    }
}

/** Get listener status */
export function getListenerStatus(): { running: boolean; port: number | null; resultsCount: number } {
    return {
        running: isListening,
        port: isListening ? (listenerServer?.address() as net.AddressInfo)?.port || null : null,
        resultsCount: recentResults.length,
    };
}

/** Process received data — try HL7 first, then raw format */
export function processReceivedData(raw: string): void {
    // Strip control characters for parsing
    const cleaned = raw.replace(/[\x00-\x01\x02\x03\x04\x05\x06\x15]/g, '');

    console.log('[HL7] Processing received data...');
    console.log('[HL7] Raw data length:', raw.length);

    // Try HL7 format first
    if (cleaned.includes('MSH') || cleaned.includes('OBX')) {
        const result = extractCBCFromHL7(cleaned);
        if (result) {
            storeResult(result);
            return;
        }
    }

    // Try raw/8ID format
    const result = extractCBCFromRaw(cleaned);
    if (result) {
        storeResult(result);
        return;
    }

    console.log('[HL7] Could not parse received data into CBC results');
    console.log('[HL7] First 500 chars:', cleaned.substring(0, 500));
}

/**
 * Manually add a result (useful for testing or manual entry from the machine)
 * This can also be used as a fallback when connected via USB to capture printed output
 */
export function addManualResult(data: Record<string, string>, sampleId?: string): MindrayCBCResult {
    const result: MindrayCBCResult = {
        timestamp: new Date().toISOString(),
        sampleId: sampleId || `MANUAL-${Date.now()}`,
        patientName: '',
        species: '',
        data,
        rawMessage: 'Manual entry',
    };
    storeResult(result);
    return result;
}
