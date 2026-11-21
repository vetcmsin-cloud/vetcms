import net from 'net';

const client = new net.Socket();
client.setTimeout(2000);

client.connect(5432, '127.0.0.1', () => {
  console.log('Connected to 5432!');
  client.destroy();
  process.exit(0);
});

client.on('error', (err) => {
  console.error('Connection failed:', err);
  process.exit(1);
});

client.on('timeout', () => {
  console.error('Connection timed out');
  client.destroy();
  process.exit(1);
});
