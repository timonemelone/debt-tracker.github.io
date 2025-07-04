require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const db      = require('./db');

// Routen importieren
const authRoutes  = require('./routes/auth');
const transactionRoutes    = require('./routes/transactions');        // Routen für Nutzer-Transaktionen
const adminRoutes = require('./routes/admin');

const app = express();

// View-Engine & Static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.basedir = app.get('views');
app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.userVorname = req.session.userVorname;
  res.locals.admin       = req.session.admin;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/admin', adminRoutes);

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf http://0.0.0.0:${PORT}`);
});
