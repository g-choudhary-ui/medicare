require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Security & Logging Middleware ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow frontend assets
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-profile-id', 'x-passcode', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limiter for profile creation (anti-abuse)
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many profile creation attempts.' },
});
app.use('/api/profile/create', createLimiter);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    service: 'medicare-backend',
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/profile', require('./routes/profile'));
app.use('/api/medications', require('./routes/medications'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/adherence', require('./routes/adherence'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/notes', require('./routes/notes'));

// ── Static Frontend (Docker monorepo) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

// SPA fallback — serve index.html for all non-API routes
app.get(/^(?!\/api|\/health).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: 'Frontend not found' });
    }
  });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start Server ───────────────────────────────────────────────────────────────
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[MediCare] Server running on port ${PORT}`);
    console.log(`[MediCare] Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start cron reminder jobs
    try {
      require('./services/reminderService');
      console.log('[MediCare] Reminder service started');
    } catch (err) {
      console.error('[MediCare] Failed to start reminder service:', err.message);
    }
  });
}

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`[MediCare] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[MediCare] Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[MediCare] Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

module.exports = app;
