require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_initial.sql'),
      'utf8'
    );
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
