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
    return res.redirect('/admin');
  }
  res.render('admin/login', { title: 'Login', error: 'Ung\u00fcltige Zugangsdaten' });
});

// \u00dcbersicht aller Saldos
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.vorname,
             COALESCE(SUM(CASE WHEN t.type='debt' THEN t.amount ELSE -t.amount END),0) AS balance
        FROM users u
        LEFT JOIN transactions t ON t.user_id = u.id
       GROUP BY u.id
       ORDER BY u.vorname`);
    const users = rows.map(r => ({
      id: r.id,
      vorname: r.vorname,
      balance: parseFloat(r.balance)
    }));
    res.render('admin/overview', { title: 'Login', users });
  } catch (err) {
    console.error('Admin GET / Error:', err);
    res.status(500).send(`<h1>500 \u2013 Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

// Formular f\u00fcr neue Transaktion (global)
router.get('/transactions/new', requireAdmin, async (req, res) => {
  try {
    const { rows: users } = await db.query('SELECT id, vorname FROM users ORDER BY vorname');
    res.render('admin/new-transaction', { title: 'Login', users, error: null, selectedUserId: null, formAction: '/admin/transactions/new' });
  } catch (err) {
    console.error('Fehler beim Laden des New-Transaction-Formulars:', err);
    res.render('admin/new-transaction', { title: 'Login', users: [], error: 'Datenbankfehler', selectedUserId: null, formAction: '/admin/transactions/new' });
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
    const { rows: users } = await db.query('SELECT id, vorname FROM users ORDER BY vorname');
    res.render('admin/new-transaction', { title: 'Login', users, error: 'Speicherfehler', selectedUserId: null, formAction: '/admin/transactions/new' });
  }
});

// neue Transaktion f\u00fcr bestimmten Nutzer
router.get('/users/:userId/transactions/new', requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  try {
    const { rows: users } = await db.query('SELECT id, vorname FROM users ORDER BY vorname');
    res.render('admin/new-transaction', {
      title: 'Login',
      users,
      error: null,
      selectedUserId: parseInt(userId,10),
      formAction: `/admin/users/${userId}/transactions/new`
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(`<h1>500 \u2013 Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

router.post('/users/:userId/transactions/new', requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  try {
    const { type, amount, date } = req.body;
    await db.query(
      `INSERT INTO transactions(user_id, type, amount, date)
       VALUES($1, $2, $3, $4)`,
      [userId, type, amount, date]
    );
    res.redirect(`/admin/users/${userId}/transactions`);
  } catch (err) {
    console.error(err);
    const { rows: users } = await db.query('SELECT id, vorname FROM users ORDER BY vorname');
    res.render('admin/new-transaction', {
      title: 'Login',
      users,
      error: 'Speicherfehler',
      selectedUserId: parseInt(userId,10),
      formAction: `/admin/users/${userId}/transactions/new`
    });
  }
});

// Liste der Transaktionen f\u00fcr bestimmten Nutzer
router.get('/users/:userId/transactions', requireAdmin, async (req, res) => {
  const userId = req.params.userId;
  try {
    const { rows: userRows } = await db.query('SELECT vorname FROM users WHERE id=$1', [userId]);
    if (userRows.length === 0) return res.status(404).send('<h1>404 \u2013 Nutzer nicht gefunden</h1>');
    const user = { id: userId, vorname: userRows[0].vorname };
    const { rows } = await db.query(
      'SELECT id, date, type, amount FROM transactions WHERE user_id=$1 ORDER BY date DESC',
      [userId]
    );
    const transactions = rows.map(tx => ({
      id: tx.id,
      date: new Date(tx.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' }),
      type: tx.type,
      amount: parseFloat(tx.amount)
    }));
    res.render('admin/user-transactions', { title: 'Login', user, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).send(`<h1>500 \u2013 Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

// Admin: Liste aller Transaktionen (bestehend)
router.get('/transactions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.date, t.type, t.amount, u.vorname
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.date DESC
    `);
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
    return res.status(500).send(`<h1>500 \u2013 Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

// Bearbeitungs-Formular anzeigen
router.get('/transactions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const returnUser = req.query.user;
    const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).send('<h1>404 \u2013 Nicht gefunden</h1>');
    }
    const tx = rows[0];
    const { rows: users } = await db.query('SELECT id, vorname FROM users ORDER BY vorname');
    return res.render('admin/edit-transaction', {
      title: 'Login',
      tx,
      users,
      error: null,
      returnUserId: returnUser
    });
  } catch (err) {
    console.error('Admin GET /transactions/:id/edit Error:', err);
    return res.status(500).send(`<h1>500 \u2013 Edit-Form Error</h1><pre>${err.stack}</pre>`);
  }
});

// Transaktion speichern
router.post('/transactions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const returnUser = req.query.user;
    const { user_id, type, amount, date } = req.body;
    await db.query(
      `UPDATE transactions
         SET user_id = $1, type = $2, amount = $3, date = $4
       WHERE id = $5`,
      [user_id, type, amount, date, id]
    );
    if (returnUser) {
      return res.redirect(`/admin/users/${returnUser}/transactions`);
    }
    return res.redirect('/admin/transactions');
  } catch (err) {
    console.error('Admin POST /transactions/:id/edit Error:', err);
    return res.status(500).send(`<h1>500 \u2013 Edit-Save Error</h1><pre>${err.stack}</pre>`);
  }
});

// Transaktion l\u00f6schen
router.post('/transactions/:id/delete', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const returnUser = req.query.user;
    await db.query('DELETE FROM transactions WHERE id = $1', [id]);
    if (returnUser) {
      return res.redirect(`/admin/users/${returnUser}/transactions`);
    }
  } catch (err) {
    console.error('Admin DELETE /transactions/:id Error:', err);
  }
  res.redirect('/admin/transactions');
});

module.exports = router;
