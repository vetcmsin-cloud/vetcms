const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
    .then(() => client.query("UPDATE lab_reports SET created_at = created_at - interval '5 hours 30 minutes';"))
    .then(() => client.query("UPDATE activity_logs SET timestamp = timestamp - interval '5 hours 30 minutes';"))
    .then(() => console.log('Fixed old reports'))
    .catch(console.error)
    .finally(() => client.end());
