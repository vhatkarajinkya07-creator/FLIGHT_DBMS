const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { pool, initDb } = require('./config/db');

const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const airlineRoutes = require('./routes/airlines');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration allowing localhost origins
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl) or any localhost port
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// Root & Health check endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Flight Booking System API is running with MySQL (Express)!' });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ detail: `Database connection failed: ${err.message}` });
  }
});

// Mount routes
app.use('/', authRoutes);
app.use('/', flightRoutes);
app.use('/', airlineRoutes);
app.use('/', bookingRoutes);
app.use('/', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ detail: err.message || 'Internal server error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Express server running on http://127.0.0.1:${PORT}`);
  await initDb();
});
