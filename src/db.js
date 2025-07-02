// src/db.js
const { Pool } = require('pg');
const bcrypt    = require('bcrypt');

// Pool mit Connection String aus ENV
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tabellen anlegen (wenn noch nicht vorhanden)
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      vorname TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT CHECK(type IN ('debt','repayment')) NOT NULL,
      amount NUMERIC NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ PostgreSQL tables ready');
})().catch(err => console.error('DB Init Error:', err));

// Seed für Emily
(async () => {
  const DEFAULT_PIN = process.env.DEFAULT_PIN || '1234';
  const res = await pool.query(
    `SELECT id FROM users WHERE vorname = $1`,
    ['Emily']
  );
  if (res.rows.length === 0) {
    const hash = await bcrypt.hash(DEFAULT_PIN, 10);
    await pool.query(
      `INSERT INTO users (vorname, pin_hash) VALUES ($1, $2)`,
      ['Emily', hash]
    );
    console.log(`✅ Seed: Emily angelegt (PIN=${DEFAULT_PIN})`);
  } else {
    console.log('✅ Seed: Emily exists');
  }
})().catch(err => console.error('Seed Error:', err));

// Exportiere eine query-Funktion
module.exports = {
  query: (text, params) => pool.query(text, params)
};