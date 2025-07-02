const express = require('express');
const db      = require('../db');
const router  = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.admin = true;
    return res.redirect('/admin/transactions/new');
  }
  res.render('admin/login', { error: 'Ungültige Zugangsdaten' });
});

// Formular für neue Transaktion (neu)
router.get('/transactions/new', requireAdmin, async (req, res) => {
  try {
    // 1) Alle Nutzer aus Postgres holen
    const { rows: users } = await db.query(
      'SELECT id, vorname FROM users ORDER BY vorname',
      []
    );
    // 2) Rendern
    res.render('admin/new-transaction', { users, error: null });
  } catch (err) {
    console.error('Fehler beim Laden des New-Transaction-Formulars:', err);
    res.render('admin/new-transaction', { users: [], error: 'Datenbankfehler' });
  }
});

router.post('/transactions/new', requireAdmin, async (req, res) => {
  try {
    const { user_id, type, amount, date } = req.body;
    await db.query(
      `INSERT INTO transactions(user_id, type, amount, date)
       VALUES($1, $2, $3, $4)`,
      [user_id, type, amount, date]
    );
    res.redirect('/admin/transactions');
  } catch (err) {
    console.error(err);
    const { rows: users } = await db.query('SELECT id, vorname FROM users');
    res.render('admin/new-transaction', { users, error: 'Speicher-Fehler' });
  }
});

router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.date, t.type, t.amount, u.vorname
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.date DESC
    `);
    res.render('admin/transactions', { transactions: rows });
  } catch (err) {
    console.error(err);
    res.render('admin/transactions', { transactions: [], error: 'Lade-Fehler' });
  }
});

// 2) Bearbeitungs-Formular anzeigen
router.get('/transactions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    // 1) Hole die Daten der Transaktion
    const { rows } = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    const tx = rows[0];

    // 2) Lade alle Nutzer für das Dropdown
    const usersRes = await db.query(
      'SELECT id, vorname FROM users ORDER BY vorname'
    );
    const users = usersRes.rows;

    // 3) Rendern
    res.render('admin/edit-transaction', { tx, users, error: null });
  } catch (err) {
    console.error('Edit-GET Error:', err);
    res.redirect('/admin/transactions');
  }
});

// 3) Bearbeitung speichern
router.post('/transactions/:id/edit', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { user_id, type, amount, date } = req.body;

  try {
    // 1) Update durchführen
    await db.query(
      `UPDATE transactions
         SET user_id = $1,
             type    = $2,
             amount  = $3,
             date    = $4
       WHERE id = $5`,
      [user_id, type, amount, date, id]
    );
    // 2) Zurück zur Liste
    res.redirect('/admin/transactions');
  } catch (err) {
    console.error('Edit-POST Error:', err);
    // 3) Bei Fehlern das Formular nochmal zeigen
    const usersRes = await db.query(
      'SELECT id, vorname FROM users ORDER BY vorname'
    );
    res.render('admin/edit-transaction', {
      tx: { id, user_id, type, amount, date },
      users: usersRes.rows,
      error: 'Fehler beim Speichern'
    });
  }
});

// 4) Transaktion löschen
router.post('/transactions/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.run(
    'DELETE FROM transactions WHERE id = ?',
    [id],
    (err) => {
      if (err) console.error(err);
      res.redirect('/admin/transactions');
    }
  );
});

module.exports = router;