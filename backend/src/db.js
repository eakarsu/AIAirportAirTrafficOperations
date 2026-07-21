const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false;
const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl,
} : {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl,
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gates (
        id SERIAL PRIMARY KEY,
        gate_number VARCHAR(20) UNIQUE NOT NULL,
        terminal VARCHAR(10) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 200,
        current_aircraft VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'available'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gates (
        id SERIAL PRIMARY KEY,
        gate_number VARCHAR(20) UNIQUE NOT NULL,
        terminal VARCHAR(10) NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 200,
        current_aircraft VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'available'
      );

      CREATE TABLE IF NOT EXISTS flights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        flight_number VARCHAR(20) NOT NULL,
        airline VARCHAR(100) NOT NULL,
        origin VARCHAR(10) NOT NULL,
        destination VARCHAR(10) NOT NULL,
        scheduled_departure TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        gate_id INTEGER REFERENCES gates(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL DEFAULT 'low',
        description TEXT,
        location VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS delays (
        id SERIAL PRIMARY KEY,
        flight_id INTEGER REFERENCES flights(id),
        delay_minutes INTEGER NOT NULL DEFAULT 0,
        cause VARCHAR(255),
        rebooking_required BOOLEAN NOT NULL DEFAULT FALSE,
        confidence_score NUMERIC(5,2)
      );

      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        analysis_type VARCHAR(100) NOT NULL,
        input_data JSONB,
        result JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_flights_scheduled_departure ON flights(scheduled_departure);
      CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON incidents(reported_at);
    `);
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.initDb = initDb;
