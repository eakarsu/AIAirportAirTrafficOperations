'use strict';
const bcrypt = require('bcryptjs');
const pool = require('../src/db');
async function main() {
  if (!['1', 'true'].includes(process.env.ALLOW_SCHEMA_MIGRATION)) throw new Error('Explicit schema/provisioning acknowledgement is required');
  const email = (process.env.PROVISION_ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || password.length < 12) throw new Error('Explicit admin email and 12+ character password are required');
  const existing = (await pool.query('SELECT password_hash FROM users WHERE email=$1', [email])).rows[0];
  if (existing) {
    if (!await bcrypt.compare(password, existing.password_hash)) throw new Error('Configured credentials do not match the existing account. Password, name, role and permissions were preserved.');
    console.log('Configured account ready. Existing account preserved.');
    return;
  }
  const inserted = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, await bcrypt.hash(password, 12), 'Runtime Administrator'],
  );
  if (!inserted.rowCount) {
    const current = (await pool.query('SELECT password_hash FROM users WHERE email=$1', [email])).rows[0];
    if (!current || !await bcrypt.compare(password, current.password_hash)) throw new Error('An account with other credentials already exists. It was preserved.');
  }
  console.log(inserted.rowCount ? 'Configured administrator provisioned.' : 'Configured account ready. Existing account preserved.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
