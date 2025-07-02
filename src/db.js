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
    
    const bcrypt = require('bcrypt');

// PIN für Emily aus ENV oder Default
const DEFAULT_PIN = process.env.DEFAULT_PIN || '1234';
db.get(
  "SELECT id FROM users WHERE vorname = 'Emily'",
  (err, row) => {
    if (err) {
      console.error('Seed-Check fehlgeschlagen:', err);
      return;
    }
    if (!row) {
      // Nur anlegen, wenn es Emily noch nicht gibt
      bcrypt.hash(DEFAULT_PIN, 10, (err, hash) => {
        if (err) {
          console.error('Hashing-Fehler beim Seeden:', err);
          return;
        }
        db.run(
          'INSERT INTO users(vorname, pin_hash) VALUES(?,?)',
          ['Emily', hash],
          err => {
            if (err) console.error('Seed-Insert fehlgeschlagen:', err);
            else console.log(`✅ Seed: Emily angelegt (PIN=${DEFAULT_PIN})`);
          }
        );
      });
    } else {
      console.log('✅ Seed: Emily existiert bereits');
    }
  }
);
  `);
});

module.exports = db;