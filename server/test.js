const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ DB Connection Failed:', err.message);
  } else {
    console.log('✅ DB Connected Successfully:', res.rows[0].now);
  }
  pool.end();
});