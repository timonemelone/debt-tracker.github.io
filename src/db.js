const fs     = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const bcrypt  = require('bcrypt');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✔️  data-Verzeichnis angelegt');

// Pfad zur Datenbank-Datei (unter /data)
const dbPath = path.join(dataDir, 'db.sqlite');
const db     = new sqlite3.Database(dbPath);

// Tabellen anlegen, falls sie noch nicht existieren
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (" +
    "id INTEGER PRIMARY KEY, " +
    "vorname TEXT UNIQUE, " +
    "pin_hash TEXT" +
    ");"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS transactions (" +
    "id INTEGER PRIMARY KEY, " +
    "user_id INTEGER, " +
    "type TEXT CHECK(type IN ('debt','repayment')), " +
    "amount REAL, " +
    "date TEXT, " +
    "created_at TEXT DEFAULT CURRENT_TIMESTAMP, " +
    "FOREIGN KEY(user_id) REFERENCES users(id)" +
    ");"
  );
});

// Emily automatisch anlegen, wenn sie noch nicht da ist
const DEFAULT_PIN = process.env.DEFAULT_PIN || '1234';
db.get(
  "SELECT id FROM users WHERE vorname = 'Emily'",
  (err, row) => {
    if (err) {
      console.error('Seed-Check fehlgeschlagen:', err);
      return;
    }
    if (!row) {
      bcrypt.hash(DEFAULT_PIN, 10, (err, hash) => {
        if (err) {
          console.error('Hashing-Fehler beim Seeden:', err);
          return;
        }
        db.run(
          "INSERT OR REPLACE INTO users(vorname, pin_hash) VALUES(?,?)",
          ['Emily', hash],
          (err) => {
            if (err) {
              console.error('Seed-Insert fehlgeschlagen:', err);
            } else {
              console.log(`✅ Seed: Emily angelegt (PIN=${DEFAULT_PIN})`);
            }
          }
        );
      });
    } else {
      console.log('✅ Seed: Emily existiert bereits');
    }
  }
);

module.exports = db;