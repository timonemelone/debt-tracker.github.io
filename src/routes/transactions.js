const express = require('express');
const db      = require('../db');
const router  = express.Router();

// Middleware: nur eingeloggte Nutzer
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.get('/', ensureLoggedIn, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT date, type, amount FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.session.userId]
    );
    res.render('transactions', { transactions: result.rows });
  } catch (err) {
    console.error('Fehler beim Laden der Transaktionen:', err);
    res.render('transactions', { transactions: [], error: 'Datenbankfehler' });
  }
});

module.exports = router;