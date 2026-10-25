const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticateToken, SECRET_KEY } = require('../middleware/auth');

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, phone_number, user_type = 'user' } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ detail: 'All required fields must be provided' });
    }

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Username or email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone_number, user_type, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [username, email, passwordHash, first_name, last_name, phone_number || null, user_type]
    );

    const newUserId = result.insertId;
    const [createdUser] = await pool.query(
      'SELECT user_id, username, email, first_name, last_name, user_type, is_active FROM users WHERE user_id = ?',
      [newUserId]
    );

    res.status(200).json(createdUser[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ detail: 'Registration failed' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        sub: user.username,
        user_type: user.user_type,
        user_id: user.user_id,
        type: 'access',
      },
      SECRET_KEY,
      { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 60}m` }
    );

    res.json({
      access_token: token,
      token_type: 'bearer',
      user_type: user.user_type,
      user_id: user.user_id,
      username: user.username,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ detail: 'Login failed' });
  }
});

// GET /profile
router.get('/profile', authenticateToken, async (req, res) => {
  res.json(req.user);
});

// PUT /profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, first_name, last_name, phone_number, password } = req.body;
    const userId = req.user.user_id;

    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE (username = ? OR email = ?) AND user_id != ?',
      [username, email, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Username or email already exists' });
    }

    let updateQuery = `
      UPDATE users 
      SET username = ?, email = ?, first_name = ?, last_name = ?, phone_number = ?
    `;
    const params = [username, email, first_name, last_name, phone_number || null];

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updateQuery += ', password_hash = ?';
      params.push(hash);
    }

    updateQuery += ' WHERE user_id = ?';
    params.push(userId);

    await pool.query(updateQuery, params);

    const [updated] = await pool.query(
      'SELECT user_id, username, email, first_name, last_name, user_type, is_active FROM users WHERE user_id = ?',
      [userId]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
