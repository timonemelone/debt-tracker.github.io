
const express = require('express');
const db = require('../db');
const router = express.Router();

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Get all transactions for logged-in user
router.get('/', requireAuth, (req, res) => {
  db.all(
    'SELECT date, type, amount FROM transactions WHERE user_id = ? ORDER BY date DESC',
    [req.session.userId],
    (err, rows) => {
      if (err) throw err;
      res.render('transactions', { transactions: rows });
    }
  );
});

// Add new transaction (debt or repayment)
router.post('/add', requireAuth, (req, res) => {
  const { type, amount, date } = req.body;
  
  db.run(
    'INSERT INTO transactions (user_id, type, amount, date) VALUES (?, ?, ?, ?)',
    [req.session.userId, type, parseFloat(amount), date],
    (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/transactions?error=1');
      }
      res.redirect('/balance');
    }
  );
});

module.exports = router;
