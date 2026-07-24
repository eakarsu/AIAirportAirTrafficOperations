'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../src/db');

async function main() {
  if (!['1', 'true'].includes(process.env.ALLOW_SCHEMA_MIGRATION)) throw new Error('Explicit schema/provisioning acknowledgement is required');
  const email = (process.env.PROVISION_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || password.length < 12) throw new Error('Explicit admin email and 12+ character password are required');
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,
       name=EXCLUDED.name, role=EXCLUDED.role`,
    [email, await bcrypt.hash(password, 12), 'Runtime Administrator'],
  );
  console.log('Administrator provisioned.');
  await pool.end();
}

main().catch(async (error) => { console.error(error.message); await pool.end().catch(() => {}); process.exitCode = 1; });
