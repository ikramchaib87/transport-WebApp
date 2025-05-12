const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'transport_app',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Test connection
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('PostgreSQL connection error:', err);
  else console.log('PostgreSQL connected successfully');
});

module.exports = pool;