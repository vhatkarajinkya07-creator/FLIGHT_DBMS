const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

let dbUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/flight_bookings_ayushman';
// Normalize mysql+pymysql:// to standard mysql:// URL
dbUrl = dbUrl.replace(/^mysql\+pymysql:\/\//, 'mysql://');

console.log('🔧 Connecting to database via:', dbUrl.replace(/:[^:@]+@/, ':****@'));

const pool = mysql.createPool({
  uri: dbUrl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // Return dates as ISO-like strings instead of Date objects to match FastAPI
});

// Seed admin user if not exists
async function initDb() {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, user_type, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
        ['admin', 'admin@flight.com', hash, 'System', 'Admin', 'admin']
      );
      console.log('✅ Admin user created (admin / admin123)');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  } catch (err) {
    console.error('⚠️ DB Initialization warning:', err.message);
  }
}

module.exports = { pool, initDb };
