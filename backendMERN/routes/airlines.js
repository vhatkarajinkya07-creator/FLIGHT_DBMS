const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /airlines
router.get('/airlines', async (req, res) => {
  try {
    const [airlines] = await pool.query('SELECT * FROM airlines WHERE is_active = 1 OR is_active IS NULL');
    res.json(airlines);
  } catch (err) {
    console.error('Error fetching airlines:', err);
    res.status(500).json({ detail: err.message });
  }
});

// POST /admin/airlines
router.post('/admin/airlines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { airline_name, airline_code } = req.body;

    const [existing] = await pool.query(
      'SELECT airline_id FROM airlines WHERE airline_name = ? OR airline_code = ?',
      [airline_name, airline_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Airline name or code already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO airlines (airline_name, airline_code, is_active) VALUES (?, ?, 1)',
      [airline_name, airline_code]
    );

    const [created] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [result.insertId]);
    res.json(created[0]);
  } catch (err) {
    console.error('Error creating airline:', err);
    res.status(500).json({ detail: err.message });
  }
});

// PUT /admin/airlines/:airline_id
router.put('/admin/airlines/:airline_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const airlineId = req.params.airline_id;
    const { airline_name, airline_code } = req.body;

    const [existingAirline] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [airlineId]);
    if (existingAirline.length === 0) {
      return res.status(404).json({ detail: 'Airline not found' });
    }

    const [conflict] = await pool.query(
      'SELECT airline_id FROM airlines WHERE (airline_name = ? OR airline_code = ?) AND airline_id != ?',
      [airline_name, airline_code, airlineId]
    );

    if (conflict.length > 0) {
      return res.status(400).json({ detail: 'Airline name or code already exists' });
    }

    await pool.query(
      'UPDATE airlines SET airline_name = ?, airline_code = ? WHERE airline_id = ?',
      [airline_name, airline_code, airlineId]
    );

    const [updated] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [airlineId]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating airline:', err);
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/airlines/:airline_id
router.delete('/admin/airlines/:airline_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const airlineId = req.params.airline_id;

    const [airline] = await pool.query('SELECT * FROM airlines WHERE airline_id = ?', [airlineId]);
    if (airline.length === 0) {
      return res.status(404).json({ detail: 'Airline not found' });
    }

    const [flights] = await pool.query('SELECT COUNT(*) as count FROM flights WHERE airline_id = ?', [airlineId]);
    if (flights[0].count > 0) {
      return res.status(400).json({
        detail: `Cannot delete airline with ${flights[0].count} associated flight(s)`,
      });
    }

    await pool.query('DELETE FROM airlines WHERE airline_id = ?', [airlineId]);
    res.json({ message: 'Airline deleted successfully' });
  } catch (err) {
    console.error('Error deleting airline:', err);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
