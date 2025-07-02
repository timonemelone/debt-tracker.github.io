const express = require('express');
const db      = require('../db');
const router  = express.Router();

// Middleware: nur eingeloggte Nutzer
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// Transaktionsverlauf anzeigen (Postgres + parseFloat)
router.get('/', ensureLoggedIn, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT date, type, amount FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.session.userId]
    );
    // amount vom String in Zahl wandeln
    const transactions = rows.map(tx => ({
      date:   tx.date,
      type:   tx.type,
      amount: parseFloat(tx.amount)
    }));
    res.render('transactions', { transactions });
  } catch (err) {
    console.error('Fehler beim Laden der Transaktionen:', err);
    res.render('transactions', { transactions: [], error: 'Datenbankfehler' });
  }
});

module.exports = router;