const express = require('express');
const db      = require('../db');
const router  = express.Router();

// Middleware: nur eingeloggte Nutzer
function ensureLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// Transaktionsverlauf anzeigen mit direkter Fehlerausgabe
router.get('/', ensureLoggedIn, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT date, type, amount FROM transactions WHERE user_id = $1 ORDER BY date DESC',
      [req.session.userId]
    );
    const transactions = rows.map(tx => ({
      date: new Date(tx.date).toLocaleString('de-DE', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Berlin'
      }),
      type: tx.type,
      amount: parseFloat(tx.amount)
    }));
    res.render('transactions', { title: 'Login', transactions, error: null });
  } catch (err) {
    console.error('Error loading transactions:', err);
    // Zeige den kompletten Stack im Browser an:
    res.status(500).send(`<h1>500 – Serverfehler</h1><pre>${err.stack}</pre>`);
  }
});

module.exports = router;
