const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes here require admin access
router.use(authenticateToken, requireAdmin);

// GET /admin/flights
router.get('/admin/flights', async (req, res) => {
  try {
    const [flights] = await pool.query(`
      SELECT f.*, a.airline_name, a.airline_code
      FROM flights f
      LEFT JOIN airlines a ON f.airline_id = a.airline_id
      ORDER BY f.departure_time ASC
    `);

    const formatted = flights.map(f => ({
      flight_id: f.flight_id,
      flight_number: f.flight_number,
      airline_id: f.airline_id,
      source_city: f.source_city,
      destination_city: f.destination_city,
      departure_time: f.departure_time,
      arrival_time: f.arrival_time,
      total_seats: f.total_seats,
      available_seats: f.available_seats,
      price: parseFloat(f.price),
      flight_status: f.flight_status,
      is_daily: Boolean(f.is_daily),
      airline_name: f.airline_name || 'Unknown',
      airline_code: f.airline_code || 'N/A',
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching admin flights:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /admin/bookings
router.get('/admin/bookings', async (req, res) => {
  try {
    const [bookings] = await pool.query('SELECT * FROM bookings ORDER BY booking_date DESC');
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching admin bookings:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /admin/users
router.get('/admin/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT user_id, username, email, first_name, last_name, user_type, is_active FROM users'
    );
    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /admin/reports/airline-performance
router.get('/admin/reports/airline-performance', async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_airline_performance_report()');
    // In mysql2, results[0] contains the first SELECT from the procedure
    const reportData = Array.isArray(results[0]) ? results[0] : results;
    res.json({ report: reportData });
  } catch (err) {
    console.error('Error in airline performance report:', err);
    res.status(500).json({ detail: `Report generation failed: ${err.message}` });
  }
});

// GET /admin/reports/user-analysis
router.get('/admin/reports/user-analysis', async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_user_booking_analysis()');
    const analysisData = Array.isArray(results[0]) ? results[0] : results;
    res.json({ analysis: analysisData });
  } catch (err) {
    console.error('Error in user analysis report:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /admin/reports/flight-revenue
router.get('/admin/reports/flight-revenue', async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_flight_revenue_analysis()');
    const revenueData = Array.isArray(results[0]) ? results[0] : results;
    res.json({ revenue_data: revenueData });
  } catch (err) {
    console.error('Error in flight revenue report:', err);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
