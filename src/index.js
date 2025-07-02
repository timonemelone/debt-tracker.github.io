require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const db      = require('./db');

// Routen importieren
const authRoutes  = require('./routes/auth');
const txRoutes    = require('./routes/transactions');        // Achtung: hier korrigieren wir gleich auf './routes/transactions'
const adminRoutes = require('./routes/admin');

const app = express();

// View-Engine & Static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Routes
app.use('/', authRoutes);
app.use('/transactions', txRoutes);
app.use('/admin', adminRoutes);

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});