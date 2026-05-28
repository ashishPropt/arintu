require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database/db');

async function seed() {
  const hash = await bcrypt.hash('Admin@123', 12);

  // Create superadmin
  await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ('superadmin@arintu.com', $1, 'Super Admin', 'superadmin')
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  // Create a demo admin
  const adminHash = await bcrypt.hash('Admin@123', 12);
  await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ('admin@arintu.com', $1, 'Demo Admin', 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [adminHash]
  );

  console.log('Seed complete');
  console.log('Superadmin: superadmin@arintu.com / Admin@123');
  console.log('Admin:      admin@arintu.com / Admin@123');
  await db.pool.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
