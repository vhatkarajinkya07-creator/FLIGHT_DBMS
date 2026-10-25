const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SECRET_KEY = process.env.SECRET_KEY || process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const username = payload.sub || payload.username;
    const userId = payload.user_id;

    if (!username) {
      return res.status(401).json({ detail: 'Invalid token payload' });
    }

    const [users] = await pool.query(
      'SELECT user_id, username, email, first_name, last_name, user_type, is_active FROM users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ detail: 'User not found or inactive' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.user_type !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, SECRET_KEY };
