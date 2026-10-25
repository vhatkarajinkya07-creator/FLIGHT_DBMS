const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /bookings
router.post('/bookings', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { flight_id, passengers_count, travel_date, payment_method = 'credit_card' } = req.body;

    if (!flight_id || !passengers_count) {
      return res.status(400).json({ detail: 'Flight ID and passenger count are required' });
    }

    // Call stored procedure sp_book_flight
    await connection.query(
      'CALL sp_book_flight(?, ?, ?, @booking_id, @message)',
      [req.user.user_id, flight_id, passengers_count]
    );

    const [out] = await connection.query('SELECT @booking_id as booking_id, @message as message');
    const { booking_id, message } = out[0] || {};

    if (!booking_id) {
      return res.status(400).json({ detail: message || 'Booking failed' });
    }

    // Update travel date if provided
    if (travel_date) {
      await connection.query('UPDATE bookings SET travel_date = ? WHERE booking_id = ?', [travel_date, booking_id]);
    }

    const [bookings] = await connection.query('SELECT * FROM bookings WHERE booking_id = ?', [booking_id]);
    const booking = bookings[0];

    // Create payment record
    const txnId = 'TXN' + crypto.randomBytes(8).toString('hex').toUpperCase();
    await connection.query(
      `INSERT INTO payments (booking_id, payment_amount, payment_method, transaction_id, payment_status, payment_date)
       VALUES (?, ?, ?, ?, 'completed', NOW())`,
      [booking_id, booking.total_amount, payment_method, txnId]
    );

    // Update payment status
    await connection.query("UPDATE bookings SET payment_status = 'completed' WHERE booking_id = ?", [booking_id]);

    const [updatedBooking] = await connection.query('SELECT * FROM bookings WHERE booking_id = ?', [booking_id]);
    res.json(updatedBooking[0]);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(400).json({ detail: err.message });
  } finally {
    connection.release();
  }
});

// GET /bookings (User's bookings)
router.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC',
      [req.user.user_id]
    );
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /bookings/:booking_id
router.get('/bookings/:booking_id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.booking_id;
    const [rows] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Booking not found' });
    }
    const b = rows[0];

    if (b.user_id !== req.user.user_id && req.user.user_type !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized to view this booking' });
    }

    const [flightRows] = await pool.query(
      `SELECT f.*, a.airline_name, a.airline_code 
       FROM flights f 
       LEFT JOIN airlines a ON f.airline_id = a.airline_id 
       WHERE f.flight_id = ?`,
      [b.flight_id]
    );
    const flight = flightRows[0];

    const [userRows] = await pool.query('SELECT user_id, username, email FROM users WHERE user_id = ?', [b.user_id]);
    const user = userRows[0];

    const [paymentRows] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);
    const payment = paymentRows[0];

    res.json({
      booking_id: b.booking_id,
      user_id: b.user_id,
      username: user ? user.username : 'Unknown',
      email: user ? user.email : 'N/A',
      flight_id: b.flight_id,
      booking_date: b.booking_date,
      travel_date: b.travel_date,
      passengers_count: b.passengers_count,
      total_amount: parseFloat(b.total_amount),
      booking_status: b.booking_status,
      payment_status: b.payment_status,
      pnr_number: b.pnr_number,
      flight: {
        flight_number: flight ? flight.flight_number : 'Unknown',
        source_city: flight ? flight.source_city : 'Unknown',
        destination_city: flight ? flight.destination_city : 'Unknown',
        departure_time: flight ? flight.departure_time : null,
        arrival_time: flight ? flight.arrival_time : null,
        is_daily: flight ? Boolean(flight.is_daily) : false,
        price: flight ? parseFloat(flight.price) : 0,
        airline: {
          airline_name: flight && flight.airline_name ? flight.airline_name : 'Unknown',
          airline_code: flight && flight.airline_code ? flight.airline_code : 'N/A',
        },
      },
      payment: payment
        ? {
            payment_method: payment.payment_method || 'N/A',
            transaction_id: payment.transaction_id || 'N/A',
            payment_date: payment.payment_date || null,
          }
        : null,
    });
  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /bookings/:booking_id (Cancel booking)
router.delete('/bookings/:booking_id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const bookingId = req.params.booking_id;

    // Check ownership or admin
    const [rows] = await connection.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Booking not found' });
    }
    const booking = rows[0];

    if (booking.user_id !== req.user.user_id && req.user.user_type !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized to cancel this booking' });
    }

    await connection.query('CALL sp_cancel_booking(?, @message)', [bookingId]);
    const [out] = await connection.query('SELECT @message as message');

    if (out.length > 0 && out[0].message) {
      res.json({ message: out[0].message, booking_id: parseInt(bookingId) });
    } else {
      res.status(400).json({ detail: 'Cancellation failed' });
    }
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(400).json({ detail: err.message });
  } finally {
    connection.release();
  }
});

// GET /payments/:booking_id
router.get('/payments/:booking_id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.booking_id;
    const [payments] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);
    if (payments.length === 0) {
      return res.status(404).json({ detail: 'Payment not found' });
    }

    const [bookings] = await pool.query('SELECT user_id FROM bookings WHERE booking_id = ?', [bookingId]);
    if (bookings.length > 0 && bookings[0].user_id !== req.user.user_id && req.user.user_type !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized' });
    }

    res.json(payments[0]);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ detail: err.message });
  }
});

// GET /user-booking-history/:user_id
router.get('/user-booking-history/:user_id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.user_id;
    if (parseInt(userId) !== req.user.user_id && req.user.user_type !== 'admin') {
      return res.status(403).json({ detail: 'Not authorized' });
    }

    const [rows] = await pool.query('SELECT * FROM user_booking_history WHERE user_id = ?', [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching booking history view:', err);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
