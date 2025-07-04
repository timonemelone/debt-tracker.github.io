const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../db');
const router  = express.Router();

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Direkt auf Login weiterleiten, wenn jemand "/" aufruft
router.get('/', (req, res) => res.redirect('/login'));

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { vorname, pin } = req.body;
    // 1) Benutzer abfragen
    const result = await db.query(
      'SELECT id, vorname, pin_hash FROM users WHERE vorname = $1',
      [vorname]
    );
    const user = result.rows[0];
    if (!user) {
      return res.render('login', { error: 'Unbekannter Benutzer' });
    }

    // 2) PIN prüfen
    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) {
      return res.render('login', { error: 'Falscher PIN' });
    }

    // 3) Session setzen & weiterleiten
    req.session.userId      = user.id;
    req.session.userVorname = user.vorname;
    res.redirect('/balance');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Serverfehler' });
  }
});

// Balance anzeigen (Postgres + parseFloat)
router.get('/balance', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  try {
    const { rows } = await db.query(
      'SELECT type, amount FROM transactions WHERE user_id = $1',
      [req.session.userId]
    );
    let balance = 0;
    rows.forEach(tx => {
      const amt = parseFloat(tx.amount);            // String → Zahl
      balance += tx.type === 'debt' ? amt : -amt;
    });
    res.render('balance', { balance });
  } catch (err) {
    console.error('Error in GET /balance:', err);
    res.render('balance', { balance: 0, error: 'Serverfehler' });
  }
});

module.exports = router;