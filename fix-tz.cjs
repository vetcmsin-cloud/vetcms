const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
    .then(() => client.query("ALTER DATABASE vet_clinic SET timezone TO 'UTC';"))
    .then(() => console.log('Done'))
    .catch(console.error)
    .finally(() => client.end());
