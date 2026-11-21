/**
 * build_update_zip.mjs
 * Creates petpoint_update_full.zip with Linux-compatible forward-slash paths.
 * Run: node script/build_update_zip.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_ZIP = path.join(ROOT, 'petpoint_update_full.zip');

// ── Inline minimal zip writer ───────────────────────────────────
// Uses Node's built-in zlib for deflate; no extra npm package needed.
import zlib from 'zlib';

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32LE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}
function writeUint16LE(n) {
  const b = Buffer.allocUnsafe(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

class ZipWriter {
  constructor(outputPath) {
    this.out = createWriteStream(outputPath);
    this.entries = [];
    this.offset = 0;
    this.closed = false;
  }

  _write(buf) {
    this.out.write(buf);
    this.offset += buf.length;
  }

  addFile(zipPath, content) {
    // zipPath must use forward slashes
    const name = Buffer.from(zipPath.replace(/\\/g, '/'));
    const compressed = zlib.deflateRawSync(content, { level: 6 });
    const crc = crc32(content);
    const localHeaderOffset = this.offset;

    // Local file header (signature 0x04034b50)
    this._write(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // sig
    this._write(writeUint16LE(20));   // version needed
    this._write(writeUint16LE(0));    // flags
    this._write(writeUint16LE(8));    // compression: deflate
    this._write(writeUint16LE(0));    // mod time
    this._write(writeUint16LE(0));    // mod date
    this._write(writeUint32LE(crc));
    this._write(writeUint32LE(compressed.length));
    this._write(writeUint32LE(content.length));
    this._write(writeUint16LE(name.length));
    this._write(writeUint16LE(0));    // extra length
    this._write(name);
    this._write(compressed);

    this.entries.push({ name, crc, compressedSize: compressed.length, uncompressedSize: content.length, offset: localHeaderOffset });
  }

  finalize() {
    const cdOffset = this.offset;
    for (const e of this.entries) {
      this._write(Buffer.from([0x50, 0x4b, 0x01, 0x02])); // central dir sig
      this._write(writeUint16LE(20));   // version made by
      this._write(writeUint16LE(20));   // version needed
      this._write(writeUint16LE(0));    // flags
      this._write(writeUint16LE(8));    // compression
      this._write(writeUint16LE(0));    // mod time
      this._write(writeUint16LE(0));    // mod date
      this._write(writeUint32LE(e.crc));
      this._write(writeUint32LE(e.compressedSize));
      this._write(writeUint32LE(e.uncompressedSize));
      this._write(writeUint16LE(e.name.length));
      this._write(writeUint16LE(0));    // extra
      this._write(writeUint16LE(0));    // comment
      this._write(writeUint16LE(0));    // disk start
      this._write(writeUint16LE(0));    // internal attr
      this._write(writeUint32LE(0));    // external attr
      this._write(writeUint32LE(e.offset));
      this._write(e.name);
    }
    const cdSize = this.offset - cdOffset;
    // End of central directory
    this._write(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    this._write(writeUint16LE(0));    // disk number
    this._write(writeUint16LE(0));    // disk with cd
    this._write(writeUint16LE(this.entries.length));
    this._write(writeUint16LE(this.entries.length));
    this._write(writeUint32LE(cdSize));
    this._write(writeUint32LE(cdOffset));
    this._write(writeUint16LE(0));    // comment length

    return new Promise((resolve) => this.out.end(resolve));
  }
}

// ── Collect files ───────────────────────────────────────────────
function collectFiles(dir, baseDir) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full, baseDir));
    } else {
      // Relative path with forward slashes
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      results.push({ rel, full });
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('🔨 Building petpoint_update_full.zip ...');
  console.log('');

  // Delete old zip if exists
  if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

  const zip = new ZipWriter(OUT_ZIP);
  let count = 0;

  // Directories to include
  const dirs = ['dist', 'shared'];
  for (const d of dirs) {
    const fullDir = path.join(ROOT, d);
    if (!fs.existsSync(fullDir)) { console.warn(`  ⚠ Skipping missing dir: ${d}`); continue; }
    const files = collectFiles(fullDir, ROOT);
    for (const { rel, full } of files) {
      const content = fs.readFileSync(full);
      zip.addFile(rel, content);
      count++;
      if (count % 10 === 0) process.stdout.write(`  → ${count} files added...\r`);
    }
  }

  // Individual files
  const singleFiles = [
    'package.json',
    'package-lock.json',
    'ecosystem.config.cjs',
    'drizzle.config.ts',
    'update_vps_full.sh',
  ];
  for (const f of singleFiles) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) { console.warn(`  ⚠ Skipping missing file: ${f}`); continue; }
    const content = fs.readFileSync(full);
    zip.addFile(f, content);
    count++;
    console.log(`  ✔ Added: ${f}`);
  }

  await zip.finalize();

  const size = (fs.statSync(OUT_ZIP).size / 1024 / 1024).toFixed(2);
  console.log('');
  console.log(`✅ Done! petpoint_update_full.zip created`);
  console.log(`   Total files : ${count}`);
  console.log(`   Size        : ${size} MB`);
  console.log(`   Path        : ${OUT_ZIP}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('   scp petpoint_update_full.zip root@<vps-ip>:/root/');
  console.log('   ssh root@<vps-ip>');
  console.log('   unzip -o /root/petpoint_update_full.zip update_vps_full.sh -d /root/');
  console.log('   chmod +x /root/update_vps_full.sh');
  console.log('   bash /root/update_vps_full.sh');
}

main().catch(e => { console.error('Build failed:', e); process.exit(1); });
