const express = require('express');
const db      = require('../db');
const router  = express.Router();

// Middleware: nur eingeloggte Nutzer
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// GET /transactions → Liste anzeigen
router.get('/', ensureLoggedIn, (req, res) => {
  db.all(
    'SELECT date, type, amount FROM transactions WHERE user_id = ? ORDER BY date DESC',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.render('transactions', { transactions: [], error: 'Datenbankfehler' });
      }
      res.render('transactions', { transactions: rows, error: null });
    }
  );
});

module.exports = router;