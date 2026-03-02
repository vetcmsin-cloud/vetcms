import 'dotenv/config';
import pg from 'pg';
import { parse } from 'url';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  const config = parse(connectionString);
  // Connect to 'postgres' db to create the new db
  const adminClient = new pg.Pool({
    user: config.auth?.split(':')[0],
    password: config.auth?.split(':')[1],
    host: config.hostname || 'localhost',
    port: parseInt(config.port || '5432'),
    database: 'postgres', // Default maintenance DB
  });

  const targetDbName = config.pathname?.split('/')[1] || 'vet_clinic';

  try {
    await adminClient.connect();
    console.log('Connected to admin database (postgres)');

    const checkRes = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkRes.rowCount === 0) {
      console.log(`Database ${targetDbName} does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database ${targetDbName} created successfully.`);
    } else {
      console.log(`Database ${targetDbName} already exists.`);
    }
  } catch (err: any) {
    console.error('Error setting up database:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('It seems the password or username is incorrect.');
      // Fallback check for 'postgres' user if 'psql' was used
      if (config.auth?.split(':')[0] === 'psql') {
        console.log('Trying fallback with username "postgres"...');
        // We might try to reconnect with postgres user here or just hint the user
      }
    }
    process.exit(1);
  } finally {
    await adminClient.end();
  }
}

main();
