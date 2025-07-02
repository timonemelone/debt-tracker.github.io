const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../db');
const router  = express.Router();

// Direkt auf Login weiterleiten, wenn jemand "/" aufruft
router.get('/', (req, res) => res.redirect('/login'));

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { vorname, pin } = req.body;
  db.get('SELECT * FROM users WHERE vorname = ?', [vorname], (err, user) => {
    if (err) return res.render('login', { error: 'Datenbankfehler' });
    if (!user) return res.render('login', { error: 'Unbekannter Benutzer' });

    bcrypt.compare(pin, user.pin_hash, (err, match) => {
      if (match) {
        req.session.userId      = user.id;
        req.session.userVorname = user.vorname;
        return res.redirect('/balance');
      } else {
        return res.render('login', { error: 'Falscher PIN' });
      }
    });
  });
});

router.get('/balance', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  db.all(
    'SELECT type, amount FROM transactions WHERE user_id = ?',
    [req.session.userId],
    (err, rows) => {
      if (err) throw err;
      let balance = 0;
      rows.forEach(tx => {
        tx.type === 'debt' ? (balance += tx.amount) : (balance -= tx.amount);
      });
      res.render('balance', { balance });
    }
  );
});

router.get('/transactions', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  db.all(
    'SELECT date, type, amount FROM transactions WHERE user_id = ? ORDER BY date DESC',
    [req.session.userId],
    (err, rows) => {
      if (err) throw err;
      res.render('transactions', { transactions: rows });
    }
  );
});

module.exports = router;