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

router.get('/transactions/new', requireAdmin, (req, res) => {
  db.all('SELECT id, vorname FROM users', [], (err, users) => {
    if (err) throw err;
    res.render('admin/new-transaction', { users, error: null });
  });
});

router.post('/transactions/new', requireAdmin, (req, res) => {
  const { user_id, type, amount, date } = req.body;
  db.run(
    'INSERT INTO transactions (user_id, type, amount, date) VALUES (?, ?, ?, ?)',
    [user_id, type, amount, date],
    err => {
      if (err) {
        console.error(err);
        return res.render('admin/new-transaction', { users: [], error: 'Fehler beim Speichern' });
      }
      res.redirect('/admin/transactions/new');
    }
  );
});

// -------------------------------------------------
// 1) Liste aller Transaktionen mit Edit/Delete-Links
router.get('/transactions', requireAdmin, (req, res) => {
  db.all(
    `SELECT t.id, t.date, t.type, t.amount, u.vorname
     FROM transactions t
     JOIN users u ON t.user_id = u.id
     ORDER BY t.date DESC`,
    [],
    (err, rows) => {
      if (err) throw err;
      res.render('admin/transactions', { transactions: rows });
    }
  );
});

// 2) Bearbeitungs-Formular anzeigen
router.get('/transactions/:id/edit', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get(
    'SELECT * FROM transactions WHERE id = ?',
    [id],
    (err, tx) => {
      if (err) throw err;
      db.all('SELECT id, vorname FROM users', [], (err, users) => {
        if (err) throw err;
        res.render('admin/edit-transaction', {
          tx,
          users,
          error: null
        });
      });
    }
  );
});

// 3) Bearbeitung speichern
router.post('/transactions/:id/edit', requireAdmin, (req, res) => {
  const { user_id, type, amount, date } = req.body;
  const id = req.params.id;
  db.run(
    `UPDATE transactions
       SET user_id = ?, type = ?, amount = ?, date = ?
     WHERE id = ?`,
    [user_id, type, amount, date, id],
    (err) => {
      if (err) {
        console.error(err);
        // Bei Fehlern das Formular nochmal mit Fehlermeldung zeigen
        return db.all('SELECT id, vorname FROM users', [], (e, users) => {
          res.render('admin/edit-transaction', {
            tx: { id, user_id, type, amount, date },
            users,
            error: 'Fehler beim Speichern'
          });
        });
      }
      res.redirect('/admin/transactions');
    }
  );
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