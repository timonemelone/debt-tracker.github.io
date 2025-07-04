// src/db.js
const { Pool } = require('pg');
const bcrypt    = require('bcrypt');

// Pool mit Connection String aus ENV
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // 1) Tabellen anlegen, falls nicht da
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

    // 2) Seed users from environment variable
    const rawUsers = process.env.USERS_JSON;
    if (rawUsers) {
      let users;
      try {
        users = JSON.parse(rawUsers);
      } catch (err) {
        console.error('USERS_JSON parse error:', err);
        users = [];
      }
      for (const { vorname, pin_hash } of users) {
        const { rows } = await pool.query(
          `SELECT id FROM users WHERE vorname = $1`,
          [vorname]
        );
        if (rows.length === 0) {
          await pool.query(
            `INSERT INTO users (vorname, pin_hash) VALUES ($1, $2)`,
            [vorname, pin_hash]
          );
          console.log(`✅ Seed: ${vorname} angelegt (Hash aus ENV)`);
        } else {
          console.log(`✅ Seed: ${vorname} existiert bereits`);
        }
      }
    }

  } catch (err) {
    console.error('DB Init/Seed Error:', err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params)
}
