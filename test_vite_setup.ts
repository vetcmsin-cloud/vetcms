import { setupVite } from './server/vite.js';
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

try {
  console.log('Testing setupVite...');
  await setupVite(server, app);
  console.log('setupVite succeeded!');
} catch (e) {
  console.error('setupVite failed with error:', e);
  process.exit(1);
}
