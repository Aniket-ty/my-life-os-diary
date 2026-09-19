require('dotenv').config();
if (typeof globalThis.fetch === 'undefined') {
  try {
    globalThis.fetch = require('node-fetch');
  } catch (e) {
    // node-fetch not installed or not needed
  }
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { startReminderCron } = require('./services/reminder.service');


const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & logging ──
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ── Health check ──
const healthHandler = async (req, res) => {
  const prisma = require('./config/database');
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', message: 'My Life OS backend is running', database: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: e.message });
  }
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ── Routes ──
app.use('/api/v1/auth',    require('./routes/auth.routes'));
app.use('/api/v1/diary',   require('./routes/diary.routes'));
app.use('/api/v1/fitness', require('./routes/fitness.routes'));
app.use('/api/v1/ai',      require('./routes/ai.routes'));
app.use('/api/v1/todos',   require('./routes/todo.routes'));
app.use('/api/v1/body-scans', require('./routes/bodyScan.routes'));
app.use('/api/v1/fitness/plans', require('./routes/workoutPlan.routes'));
app.use('/api/v1/expenses', require('./routes/expense.routes'));
app.use('/api/v1/groups', require('./routes/group.routes'));
app.use('/api/v1/settlements', require('./routes/settlement.routes'));
app.use('/api/v1/currencies', require('./routes/currency.routes'));
app.use('/api/v1/receipts', require('./routes/receipt.routes'));
app.use('/api/v1/voice', require('./routes/voice.routes'));
app.use('/api/v1/notifications', require('./routes/notification.routes'));
app.use('/api/v1/sync', require('./routes/sync.routes'));

// Aliases without /v1
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/sync', require('./routes/sync.routes'));

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  startReminderCron();
});
