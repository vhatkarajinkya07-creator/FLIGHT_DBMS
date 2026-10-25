const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /cities (Placed before /flights/:id to avoid route collision)
router.get('/cities', async (req, res) => {
  try {
    const [sourceRows] = await pool.query('SELECT DISTINCT source_city FROM flights WHERE source_city IS NOT NULL');
    const [destRows] = await pool.query('SELECT DISTINCT destination_city FROM flights WHERE destination_city IS NOT NULL');

    res.json({
      sources: sourceRows.map(r => r.source_city),
      destinations: destRows.map(r => r.destination_city),
    });
  } catch (err) {
    console.error('Error fetching cities:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /flights/daily-schedule
router.get('/flights/daily-schedule', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM daily_flight_schedule');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching daily schedule:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /flights/revenue-summary
router.get('/flights/revenue-summary', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM flight_revenue_summary');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching revenue summary:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /debug/flights
router.get('/debug/flights', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM flights');
    res.json({ total_flights: rows.length, flights: rows });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /flights (Search flights)
router.get('/flights', async (req, res) => {
  try {
    const { source, destination, date, airline_id } = req.query;
    console.log(`🔍 Flight search - source: ${source}, destination: ${destination}, date: ${date}, airline: ${airline_id}`);

    let sql = `
      SELECT f.*, a.airline_name, a.airline_code
      FROM flights f
      INNER JOIN airlines a ON f.airline_id = a.airline_id
      WHERE f.available_seats > 0
    `;
    const params = [];

    if (source && source.trim()) {
      sql += ' AND LOWER(f.source_city) LIKE LOWER(?)';
      params.push(`%${source.trim()}%`);
    }

    if (destination && destination.trim()) {
      sql += ' AND LOWER(f.destination_city) LIKE LOWER(?)';
      params.push(`%${destination.trim()}%`);
    }

    if (airline_id) {
      sql += ' AND f.airline_id = ?';
      params.push(parseInt(airline_id));
    }

    if (date && date.trim()) {
      sql += ' AND (f.is_daily = 1 OR (DATE(f.departure_time) = ? AND f.is_daily = 0))';
      params.push(date.trim());
    }

    sql += ' ORDER BY f.departure_time ASC';

    const [flights] = await pool.query(sql, params);

    // Format output matching FlightResponse
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
      airline_name: f.airline_name,
      airline_code: f.airline_code,
    }));

    console.log(`✅ Found ${formatted.length} flights`);
    res.json(formatted);
  } catch (err) {
    console.error('❌ Error in flight search:', err);
    res.json([]);
  }
});

// GET /flights/:flight_id/duration
router.get('/flights/:flight_id/duration', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fn_calculate_flight_duration(departure_time, arrival_time) as duration_hours FROM flights WHERE flight_id = ?',
      [req.params.flight_id]
    );
    res.json({ duration_hours: rows.length > 0 ? rows[0].duration_hours : null });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /flights/:flight_id/available-seats
router.get('/flights/:flight_id/available-seats', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fn_check_seat_availability(?) as available_seats',
      [req.params.flight_id]
    );
    res.json({ available_seats: rows.length > 0 ? rows[0].available_seats : 0 });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /flights/:flight_id
router.get('/flights/:flight_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, a.airline_name, a.airline_code
       FROM flights f
       INNER JOIN airlines a ON f.airline_id = a.airline_id
       WHERE f.flight_id = ?`,
      [req.params.flight_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Flight not found' });
    }

    const f = rows[0];
    res.json({
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
      airline_name: f.airline_name,
      airline_code: f.airline_code,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// POST /flights (Create flight - Admin only)
router.post('/flights', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      flight_number,
      airline_id,
      source_city,
      destination_city,
      departure_time,
      arrival_time,
      total_seats,
      price,
      is_daily = false,
    } = req.body;

    const [existing] = await pool.query('SELECT flight_id FROM flights WHERE flight_number = ?', [flight_number]);
    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Flight number already exists' });
    }

    const [airlines] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [airline_id]);
    if (airlines.length === 0) {
      return res.status(400).json({ detail: 'Invalid airline ID' });
    }
    const airline = airlines[0];

    let duration_minutes = null;
    let departure_time_only = null;
    let arrival_time_only = null;

    if (is_daily) {
      const depDate = new Date(departure_time);
      const arrDate = new Date(arrival_time);
      duration_minutes = Math.round((arrDate - depDate) / (1000 * 60));
      departure_time_only = depDate.toTimeString().split(' ')[0];
      arrival_time_only = arrDate.toTimeString().split(' ')[0];
    }

    const [result] = await pool.query(
      `INSERT INTO flights (
        flight_number, airline_id, source_city, destination_city,
        departure_time, arrival_time, total_seats, price, is_daily,
        departure_time_only, arrival_time_only, duration_minutes,
        available_seats, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        flight_number,
        airline_id,
        source_city,
        destination_city,
        departure_time,
        arrival_time,
        total_seats,
        price,
        is_daily ? 1 : 0,
        departure_time_only,
        arrival_time_only,
        duration_minutes,
        total_seats,
        req.user.user_id,
      ]
    );

    const flightId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM flights WHERE flight_id = ?', [flightId]);
    const f = rows[0];

    res.json({
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
      airline_name: airline.airline_name,
      airline_code: airline.airline_code,
    });
  } catch (err) {
    console.error('Error creating flight:', err);
    res.status(500).json({ detail: err.message });
  }
});

// PUT /flights/:flight_id (Update flight - Admin only)
router.put('/flights/:flight_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const flightId = req.params.flight_id;
    const {
      flight_number,
      airline_id,
      source_city,
      destination_city,
      departure_time,
      arrival_time,
      total_seats,
      price,
      is_daily = false,
    } = req.body;

    const [currentRows] = await pool.query('SELECT * FROM flights WHERE flight_id = ?', [flightId]);
    if (currentRows.length === 0) {
      return res.status(404).json({ detail: 'Flight not found' });
    }
    const currentFlight = currentRows[0];

    const [existing] = await pool.query(
      'SELECT flight_id FROM flights WHERE flight_number = ? AND flight_id != ?',
      [flight_number, flightId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Flight number already exists' });
    }

    const [airlines] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [airline_id]);
    if (airlines.length === 0) {
      return res.status(400).json({ detail: 'Invalid airline ID' });
    }
    const airline = airlines[0];

    let duration_minutes = null;
    let departure_time_only = null;
    let arrival_time_only = null;

    if (is_daily) {
      const depDate = new Date(departure_time);
      const arrDate = new Date(arrival_time);
      duration_minutes = Math.round((arrDate - depDate) / (1000 * 60));
      departure_time_only = depDate.toTimeString().split(' ')[0];
      arrival_time_only = arrDate.toTimeString().split(' ')[0];
    }

    let available_seats = currentFlight.available_seats;
    if (!is_daily && currentFlight.total_seats !== total_seats) {
      const booked = currentFlight.total_seats - currentFlight.available_seats;
      available_seats = Math.max(0, total_seats - booked);
    }

    await pool.query(
      `UPDATE flights SET
        flight_number = ?, airline_id = ?, source_city = ?, destination_city = ?,
        departure_time = ?, arrival_time = ?, total_seats = ?, price = ?,
        is_daily = ?, departure_time_only = ?, arrival_time_only = ?,
        duration_minutes = ?, available_seats = ?
       WHERE flight_id = ?`,
      [
        flight_number,
        airline_id,
        source_city,
        destination_city,
        departure_time,
        arrival_time,
        total_seats,
        price,
        is_daily ? 1 : 0,
        departure_time_only,
        arrival_time_only,
        duration_minutes,
        available_seats,
        flightId,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM flights WHERE flight_id = ?', [flightId]);
    const f = rows[0];

    res.json({
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
      airline_name: airline.airline_name,
      airline_code: airline.airline_code,
    });
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /flights/:flight_id (Admin only)
router.delete('/flights/:flight_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const flightId = req.params.flight_id;
    const [rows] = await pool.query('SELECT * FROM flights WHERE flight_id = ?', [flightId]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Flight not found' });
    }

    const [activeBookings] = await pool.query(
      `SELECT COUNT(*) as count FROM bookings WHERE flight_id = ? AND booking_status IN ('confirmed', 'pending')`,
      [flightId]
    );

    if (activeBookings[0].count > 0) {
      return res.status(400).json({
        detail: `Cannot delete flight with ${activeBookings[0].count} active booking(s)`,
      });
    }

    await pool.query('DELETE FROM flights WHERE flight_id = ?', [flightId]);
    res.json({ message: 'Flight deleted successfully' });
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
