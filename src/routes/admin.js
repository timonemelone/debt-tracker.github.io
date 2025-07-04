const express = require('express');
const db      = require('../db');
const router  = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Login', error: null });
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
  res.render('admin/login', { title: 'Login', error: 'Ungültige Zugangsdaten' });
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
    res.render('admin/new-transaction', { title: 'Login', users, error: null });
  } catch (err) {
    console.error('Fehler beim Laden des New-Transaction-Formulars:', err);
    res.render('admin/new-transaction', { title: 'Login', users: [], error: 'Datenbankfehler' });
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
    res.render('admin/new-transaction', { title: 'Login', users, error: 'Speicherfehler' });
  }
});

// Admin: Liste aller Transaktionen mit direkter Fehleranzeige
router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.date, t.type, t.amount, u.vorname
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.date DESC
    `);
        // amount als Zahl umwandeln, damit toFixed klappt
    const transactions = rows.map(tx => ({
      id:      tx.id,
      date:    tx.date,
      type:    tx.type,
      vorname: tx.vorname,
      amount:  parseFloat(tx.amount)
    }));
    res.render('admin/transactions', { title: 'Login', transactions, error: null });
  } catch (err) {
    console.error('Admin GET /transactions Error:', err);
    // Zeige den Stack direkt im Browser:
    return res.status(500).send(`<h1>500 – Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

// 2) Bearbeitungs-Formular anzeigen
// Debug-GET für Transaktion bearbeiten
router.get('/transactions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).send(`<h1>404 – Nicht gefunden</h1>`);
    }
    const tx = rows[0];
    const { rows: users } = await db.query(
      'SELECT id, vorname FROM users ORDER BY vorname'
    );
    return res.render('admin/edit-transaction', { title: 'Login', tx, users, error: null });
  } catch (err) {
    console.error('Admin GET /transactions/:id/edit Error:', err);
    return res
      .status(500)
      .send(`<h1>500 – Edit-Form Error</h1><pre>${err.stack}</pre>`);
  }
});


// Debug-POST für Transaktion speichern
router.post('/transactions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { user_id, type, amount, date } = req.body;
    await db.query(
      `UPDATE transactions
         SET user_id = $1, type = $2, amount = $3, date = $4
       WHERE id = $5`,
      [user_id, type, amount, date, id]
    );
    return res.redirect('/admin/transactions');
  } catch (err) {
    console.error('Admin POST /transactions/:id/edit Error:', err);
    return res
      .status(500)
      .send(`<h1>500 – Edit-Save Error</h1><pre>${err.stack}</pre>`);
  }
});


// Admin: Transaktion löschen mit async/await und db.query
router.post('/transactions/:id/delete', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await db.query(
      'DELETE FROM transactions WHERE id = $1',
      [id]
    );
  } catch (err) {
    console.error('Admin DELETE /transactions/:id Error:', err);
  }
  // egal ob Erfolg oder Fehler, zurück zur Liste
  res.redirect('/admin/transactions');
});


module.exports = router;