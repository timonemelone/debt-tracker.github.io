const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

// Datenbank-Datei im Unterordner data/
const dbPath = path.join(__dirname, '..', 'data', 'db.sqlite');
const dataDir = path.dirname(dbPath);

// Erstelle data-Ordner falls er nicht existiert
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('Verbindung zur SQLite-Datenbank hergestellt.');
  }
});

db.serialize(() => {
  // Tabelle für Nutzer:innen
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY,
      vorname   TEXT UNIQUE,
      pin_hash  TEXT
    );
  `);

  // Tabelle für Transaktionen
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY,
      user_id     INTEGER,
      type        TEXT CHECK(type IN ('debt','repayment')),
      amount      REAL,
      date        TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
});

module.exports = db;