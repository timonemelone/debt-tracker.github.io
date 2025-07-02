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

module.exports = router;